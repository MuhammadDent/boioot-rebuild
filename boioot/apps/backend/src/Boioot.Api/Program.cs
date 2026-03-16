using System.Text;
using System.Text.Json.Serialization;
using Boioot.Application.Exceptions;
using Boioot.Domain.Constants;
using Boioot.Infrastructure.Extensions;
using Boioot.Infrastructure.Persistence;
using Boioot.Infrastructure.Persistence.Seeding;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(opt =>
        opt.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
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
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireRole(RoleNames.Admin));

    options.AddPolicy("AdminOrCompanyOwner", policy =>
        policy.RequireRole(RoleNames.Admin, RoleNames.CompanyOwner));

    options.AddPolicy("AdminOrCompanyOwnerOrAgent", policy =>
        policy.RequireRole(RoleNames.Admin, RoleNames.CompanyOwner, RoleNames.Agent));
});

var app = builder.Build();

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var error = context.Features.Get<IExceptionHandlerFeature>()?.Error;
        context.Response.ContentType = "application/json";

        if (error is BoiootException boiootEx)
        {
            context.Response.StatusCode = boiootEx.StatusCode;
            await context.Response.WriteAsJsonAsync(new { error = boiootEx.Message });
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
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<BoiootDbContext>();
    var seeder = scope.ServiceProvider.GetRequiredService<DataSeeder>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        await db.Database.EnsureCreatedAsync();
        logger.LogInformation("Database schema ensured (SQLite)");

        // ── Manual schema migration for SQLite (EnsureCreated doesn't alter existing tables) ──
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Properties ADD COLUMN Neighborhood TEXT"); }
        catch { /* column already exists */ }

        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Properties ADD COLUMN Currency TEXT NOT NULL DEFAULT 'SYP'"); }
        catch { /* column already exists */ }

        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Properties ADD COLUMN Province TEXT"); }
        catch { /* column already exists */ }

        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE LocationCities ADD COLUMN Province TEXT NOT NULL DEFAULT ''"); }
        catch { /* column already exists */ }

        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Users ADD COLUMN ProfileImageUrl TEXT"); }
        catch { /* column already exists */ }

        try
        {
            await db.Database.ExecuteSqlRawAsync(@"
                CREATE TABLE IF NOT EXISTS Favorites (
                    Id TEXT NOT NULL PRIMARY KEY,
                    UserId TEXT NOT NULL,
                    PropertyId TEXT NOT NULL,
                    CreatedAt TEXT NOT NULL DEFAULT '',
                    UpdatedAt TEXT NOT NULL DEFAULT ''
                )");
        }
        catch { /* table already exists */ }

        // Update existing cities with their correct provinces
        var cityProvinceMap = new Dictionary<string, string>
        {
            ["دمشق"]        = "دمشق",
            ["حلب"]         = "حلب",
            ["حمص"]         = "حمص",
            ["حماة"]        = "حماة",
            ["اللاذقية"]    = "اللاذقية",
            ["طرطوس"]       = "طرطوس",
            ["دير الزور"]   = "دير الزور",
            ["الرقة"]       = "الرقة",
            ["السويداء"]    = "السويداء",
            ["درعا"]        = "درعا",
            ["القامشلي"]    = "الحسكة",
            ["الحسكة"]      = "الحسكة",
            ["إدلب"]        = "إدلب",
        };
        foreach (var kv in cityProvinceMap)
        {
            try
            {
                await db.Database.ExecuteSqlRawAsync(
                    "UPDATE LocationCities SET Province = {0} WHERE Name = {1} AND (Province IS NULL OR Province = '')",
                    kv.Value, kv.Key);
            }
            catch { /* ignore */ }
        }

        // Create PropertyListingTypes table if it doesn't exist
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS PropertyListingTypes (
                Id TEXT NOT NULL PRIMARY KEY,
                Value TEXT NOT NULL,
                Label TEXT NOT NULL,
                [Order] INTEGER NOT NULL DEFAULT 0,
                IsActive INTEGER NOT NULL DEFAULT 1,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NOT NULL
            )");

        try { await db.Database.ExecuteSqlRawAsync("CREATE UNIQUE INDEX IF NOT EXISTS IX_PropertyListingTypes_Value ON PropertyListingTypes(Value)"); }
        catch { /* index already exists */ }

        // Seed default listing types if none exist
        var hasListingTypes = db.PropertyListingTypes.Any();
        if (!hasListingTypes)
        {
            var now = DateTime.UtcNow.ToString("O");
            var defaults = new[]
            {
                (Guid.NewGuid(), "Sale",      "للبيع",       1),
                (Guid.NewGuid(), "Rent",      "للإيجار",     2),
                (Guid.NewGuid(), "DailyRent", "إيجار يومي",  3),
            };
            foreach (var (id, value, label, order) in defaults)
            {
                await db.Database.ExecuteSqlRawAsync(
                    "INSERT OR IGNORE INTO PropertyListingTypes (Id, Value, Label, [Order], IsActive, CreatedAt, UpdatedAt) VALUES ({0}, {1}, {2}, {3}, 1, {4}, {5})",
                    id.ToString(), value, label, order, now, now);
            }
            logger.LogInformation("Seeded default listing types");
        }

        // Create LocationCities table
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS LocationCities (
                Id TEXT NOT NULL PRIMARY KEY,
                Name TEXT NOT NULL,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NOT NULL
            )");
        try { await db.Database.ExecuteSqlRawAsync("CREATE UNIQUE INDEX IF NOT EXISTS IX_LocationCities_Name ON LocationCities(Name)"); }
        catch { /* already exists */ }

        // Seed Syrian cities if none exist
        var hasCities = db.LocationCities.Any();
        if (!hasCities)
        {
            var now2 = DateTime.UtcNow.ToString("O");
            var cities = new[] { "دمشق", "حلب", "حمص", "اللاذقية", "طرطوس", "حماة", "دير الزور", "الرقة", "السويداء", "درعا", "القامشلي", "إدلب", "الحسكة" };
            foreach (var city in cities)
            {
                await db.Database.ExecuteSqlRawAsync(
                    "INSERT OR IGNORE INTO LocationCities (Id, Name, CreatedAt, UpdatedAt) VALUES ({0}, {1}, {2}, {3})",
                    Guid.NewGuid().ToString(), city, now2, now2);
            }
            logger.LogInformation("Seeded Syrian cities");
        }

        // Create LocationNeighborhoods table
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS LocationNeighborhoods (
                Id TEXT NOT NULL PRIMARY KEY,
                Name TEXT NOT NULL,
                City TEXT NOT NULL,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NOT NULL
            )");
        try { await db.Database.ExecuteSqlRawAsync("CREATE UNIQUE INDEX IF NOT EXISTS IX_LocationNeighborhoods_Name_City ON LocationNeighborhoods(Name, City)"); }
        catch { /* already exists */ }

        await seeder.SeedAsync();
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "تعذّر تهيئة قاعدة البيانات أو تنفيذ بيانات البذر");
    }
}

app.Run();
