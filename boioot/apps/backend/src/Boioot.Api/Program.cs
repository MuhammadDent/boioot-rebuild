using System.Text;
using System.Text.Json.Serialization;
using Boioot.Api.Authorization;
using Boioot.Application.Exceptions;
using Boioot.Application.Features.Billing.Settings;
using Boioot.Domain.Constants;
using Boioot.Infrastructure.Extensions;
using Boioot.Infrastructure.Persistence;
using Boioot.Infrastructure.Persistence.Seeding;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// ── Allow large request bodies (base64 images in JSON) ────────────────────────
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 104_857_600; // 100 MB
});

builder.Services.AddControllers()
    .AddJsonOptions(opt =>
        opt.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.Configure<BankInstructionsOptions>(
    builder.Configuration.GetSection(BankInstructionsOptions.SectionName));
builder.Services.Configure<StripeOptions>(
    builder.Configuration.GetSection(StripeOptions.SectionName));
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Jwt:Key is not configured in appsettings");

if (Encoding.UTF8.GetByteCount(jwtKey) < 32)
    throw new InvalidOperationException("Jwt:Key must be at least 32 bytes");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization(options =>
{
    // ── Role-based policies (kept for non-admin areas) ────────────────────────
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireRole(RoleNames.Admin));

    options.AddPolicy("AdminOrCompanyOwner", policy =>
        policy.RequireRole(RoleNames.Admin, RoleNames.CompanyOwner));

    options.AddPolicy("AdminOrCompanyOwnerOrAgent", policy =>
        policy.RequireRole(RoleNames.Admin, RoleNames.CompanyOwner, RoleNames.Agent, RoleNames.Broker));

    // ── Legacy blog policies — retained for backward compatibility ─────────────
    // AdminBlogController now uses [RequirePermission] directly, but we keep
    // these so any external callers or older attributes don't break.
    options.AddPolicy(BlogPermissions.CreatePost,       p => p.RequireRole(RoleNames.Admin));
    options.AddPolicy(BlogPermissions.EditPost,         p => p.RequireRole(RoleNames.Admin));
    options.AddPolicy(BlogPermissions.PublishPost,      p => p.RequireRole(RoleNames.Admin));
    options.AddPolicy(BlogPermissions.DeletePost,       p => p.RequireRole(RoleNames.Admin));
    options.AddPolicy(BlogPermissions.ManageCategories, p => p.RequireRole(RoleNames.Admin));
});

// ── Permission-based authorization (RBAC) ─────────────────────────────────────
// PermissionPolicyProvider dynamically creates a policy for any "Permission:X" request.
// PermissionAuthorizationHandler evaluates the "permission" JWT claims.
builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
builder.Services.AddScoped<IAuthorizationHandler, PermissionAuthorizationHandler>();

var app = builder.Build();

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var error = context.Features.Get<IExceptionHandlerFeature>()?.Error;
        context.Response.ContentType = "application/json";

        if (error is PlanFeatureDisabledException featureEx)
        {
            context.Response.StatusCode = featureEx.StatusCode;
            await context.Response.WriteAsJsonAsync(new
            {
                code            = featureEx.ErrorCode,
                feature         = featureEx.FeatureKey,
                message         = featureEx.Message,
                upgradeRequired = featureEx.UpgradeRequired,
            });
        }
        else if (error is PlanLimitException planEx)
        {
            context.Response.StatusCode = planEx.StatusCode;
            await context.Response.WriteAsJsonAsync(new
            {
                code            = planEx.ErrorCode,
                limit           = planEx.LimitKey,
                message         = planEx.Message,
                upgradeRequired = planEx.UpgradeRequired,
            });
        }
        else if (error is BoiootException boiootEx)
        {
            context.Response.StatusCode = boiootEx.StatusCode;
            await context.Response.WriteAsJsonAsync(new
            {
                error = boiootEx.Message,
                code  = boiootEx.ErrorCode,
            });
        }
        else
        {
            context.Response.StatusCode = 500;
            var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
            logger.LogError(error, "Unhandled exception on {Method} {Path}",
                context.Request.Method, context.Request.Path);
            await context.Response.WriteAsJsonAsync(new { error = "حدث خطأ داخلي في الخادم" });
        }
    });
});

app.UseCors();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));
app.MapControllers();

// ── Database initialization and seeding ───────────────────────────────────────────────
{
    using var startupScope = app.Services.CreateScope();
    var startupServices = startupScope.ServiceProvider;
    var startupLogger   = startupServices.GetRequiredService<ILogger<Program>>();

    try
    {
        await startupServices
            .GetRequiredService<DatabaseStartupService>()
            .InitializeAsync();

        await startupServices
            .GetRequiredService<SchemaEvolutionService>()
            .ApplyPatchesAsync();

        await startupServices
            .GetRequiredService<DataSeeder>()
            .SeedAsync();

        await startupServices
            .GetRequiredService<PlanCatalogSeeder>()
            .SeedAsync();

        await startupServices
            .GetRequiredService<SiteContentSeeder>()
            .SeedAsync();

        startupLogger.LogInformation("Database initialization and seeding complete.");
    }
    catch (Exception ex)
    {
        startupLogger.LogError(ex, "تعذّر تهيئة قاعدة البيانات أو تنفيذ بيانات البذر");
    }
}

app.Run();
