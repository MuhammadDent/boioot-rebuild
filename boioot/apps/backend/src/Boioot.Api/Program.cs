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

// ── Kestrel: bind to PORT (production) or DOTNET_PORT (dev) ──────────────────
// Production (Replit Autoscale): PORT is assigned dynamically; DOTNET_PORT not set.
// Dev (run-api.sh):              DOTNET_PORT=5233; PORT=8080 belongs to the proxy.
var kestrelPortStr = Environment.GetEnvironmentVariable("DOTNET_PORT")
                  ?? Environment.GetEnvironmentVariable("PORT")
                  ?? "8080";
var kestrelPort = int.TryParse(kestrelPortStr, out var p) ? p : 8080;
Console.WriteLine($"[startup] PORT={Environment.GetEnvironmentVariable("PORT") ?? "(not set)"}  DOTNET_PORT={Environment.GetEnvironmentVariable("DOTNET_PORT") ?? "(not set)"}  Kestrel→{kestrelPort}");

builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(kestrelPort);
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
builder.Services.AddMemoryCache();

builder.Services.AddCors(options =>
{
    var rawOrigins = builder.Configuration["AllowedOrigins"];
    var origins = rawOrigins?
        .Split(",", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .Where(o => !string.IsNullOrWhiteSpace(o))
        .ToArray();

    options.AddDefaultPolicy(policy =>
    {
        if (origins?.Length > 0)
            // Production: restrict to explicit allowed origins only
            policy.WithOrigins(origins).AllowAnyMethod().AllowAnyHeader().AllowCredentials();
        else
            // Development / local: allow all origins (no credentials restriction)
            policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
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

    // ── Projects: only Admin OR CompanyOwner with account_type=Company ────────
    // Office accounts also have CompanyOwner role but must NOT access Projects.
    options.AddPolicy("CompanyProjectsOnly", policy =>
        policy.RequireAssertion(ctx =>
            ctx.User.IsInRole(RoleNames.Admin) ||
            (ctx.User.IsInRole(RoleNames.CompanyOwner) &&
             ctx.User.FindFirst("account_type")?.Value == "Company")));

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

        if (error is PolicyDeniedException policyEx)
        {
            context.Response.StatusCode = policyEx.StatusCode;
            await context.Response.WriteAsJsonAsync(new
            {
                code          = policyEx.ErrorCode,
                feature       = policyEx.FeatureKey,
                policy        = policyEx.Policy,
                message       = policyEx.Message,
                adminRequired = policyEx.AdminRequired,
            });
        }
        else if (error is PlanFeatureDisabledException featureEx)
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
                code              = planEx.ErrorCode,
                limitKey          = planEx.LimitKey,
                currentValue      = planEx.CurrentValue,
                planLimit         = planEx.PlanLimit,
                suggestedPlanCode = planEx.SuggestedPlanCode,
                message           = planEx.Message,
                upgradeRequired   = planEx.UpgradeRequired,
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

// ── Database initialization and seeding (runs in background after app binds PORT) ────
// IMPORTANT: Must run AFTER app.StartAsync() so Kestrel is already listening.
// This prevents Replit's health check from timing out during long DB init.
_ = Task.Run(async () =>
{
    // Brief delay to ensure the server is fully bound before we start DB work.
    await Task.Delay(TimeSpan.FromSeconds(2));

    await using var bgScope = app.Services.CreateAsyncScope();
    var bgServices = bgScope.ServiceProvider;
    var bgLogger   = bgServices.GetRequiredService<ILogger<Program>>();

    try
    {
        bgLogger.LogInformation("[startup] Starting database initialization...");

        await bgServices
            .GetRequiredService<DatabaseStartupService>()
            .InitializeAsync();

        await bgServices
            .GetRequiredService<SchemaEvolutionService>()
            .ApplyPatchesAsync();

        await bgServices
            .GetRequiredService<DataSeeder>()
            .SeedAsync();

        await bgServices
            .GetRequiredService<PlanCatalogSeeder>()
            .SeedAsync();

        await bgServices
            .GetRequiredService<SiteContentSeeder>()
            .SeedAsync();

        bgLogger.LogInformation("[startup] Database initialization and seeding complete.");
    }
    catch (Exception ex)
    {
        bgLogger.LogError(ex, "[startup] تعذّر تهيئة قاعدة البيانات أو تنفيذ بيانات البذر — التطبيق يستمر بدون قاعدة البيانات");
    }
});

// app.Run() binds to PORT immediately — health check responds at t=0.
Console.WriteLine($"[startup] Server starting on port {kestrelPort} ...");
app.Run();
Console.WriteLine($"[startup] Server stopped.");
