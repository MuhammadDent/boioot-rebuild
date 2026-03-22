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

        if (error is BoiootException boiootEx)
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

// ── Schema compatibility check: add missing columns WITHOUT deleting data ──────────────
{
    var startupLogger = app.Services.GetRequiredService<ILogger<Program>>();
    using (var checkScope = app.Services.CreateScope())
    {
        var checkDb = checkScope.ServiceProvider.GetRequiredService<BoiootDbContext>();

        // Add missing BlogPosts columns safely (ignore if already present)
        var blogPostsColumns = new (string col, string def)[]
        {
            ("SeoMode",           "TEXT NOT NULL DEFAULT 'Auto'"),
            ("OgTitle",           "TEXT"),
            ("OgDescription",     "TEXT"),
            ("CoverImageAlt",     "TEXT"),
            ("SeoTitleMode",      "TEXT NOT NULL DEFAULT 'Auto'"),
            ("SeoDescriptionMode","TEXT NOT NULL DEFAULT 'Auto'"),
            ("SlugMode",          "TEXT NOT NULL DEFAULT 'Auto'"),
        };
        foreach (var (col, def) in blogPostsColumns)
        {
            try { await checkDb.Database.ExecuteSqlRawAsync($"ALTER TABLE BlogPosts ADD COLUMN {col} {def}"); }
            catch { /* already exists — skip */ }
        }

        // Add missing BlogSeoSettings columns safely
        var blogSeoColumns = new (string col, string def)[]
        {
            ("DefaultOgTitleTemplate",       "TEXT NOT NULL DEFAULT '{PostTitle} | {SiteName}'"),
            ("DefaultOgDescriptionTemplate", "TEXT NOT NULL DEFAULT '{Excerpt}'"),
        };
        foreach (var (col, def) in blogSeoColumns)
        {
            try { await checkDb.Database.ExecuteSqlRawAsync($"ALTER TABLE BlogSeoSettings ADD COLUMN {col} {def}"); }
            catch { /* already exists — skip */ }
        }

        startupLogger.LogInformation("Schema migration columns applied (ALTER TABLE, safe)");
    }
}

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

        // ── Location NormalizedName columns (Arabic duplicate prevention) ─────────
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE LocationCities ADD COLUMN NormalizedName TEXT NOT NULL DEFAULT ''"); }
        catch { /* column already exists */ }

        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE LocationNeighborhoods ADD COLUMN NormalizedName TEXT NOT NULL DEFAULT ''"); }
        catch { /* column already exists */ }

        // Backfill NormalizedName from Name for existing rows (SQL-level approximation)
        try
        {
            await db.Database.ExecuteSqlRawAsync(@"
                UPDATE LocationCities SET NormalizedName =
                    TRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                        REPLACE(Name, char(0x0640), ''),
                        char(0x0623), char(0x0627)),
                        char(0x0625), char(0x0627)),
                        char(0x0622), char(0x0627)),
                        char(0x0649), char(0x064A)),
                    '  ', ' '))
                WHERE NormalizedName = '' OR NormalizedName IS NULL");
        }
        catch { /* ignore backfill errors */ }

        try
        {
            await db.Database.ExecuteSqlRawAsync(@"
                UPDATE LocationNeighborhoods SET NormalizedName =
                    TRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                        REPLACE(Name, char(0x0640), ''),
                        char(0x0623), char(0x0627)),
                        char(0x0625), char(0x0627)),
                        char(0x0622), char(0x0627)),
                        char(0x0649), char(0x064A)),
                    '  ', ' '))
                WHERE NormalizedName = '' OR NormalizedName IS NULL");
        }
        catch { /* ignore backfill errors */ }

        // ── Location IsActive column ──────────────────────────────────────────────
        // Must be added BEFORE deduplication logic below.
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE LocationCities ADD COLUMN IsActive INTEGER NOT NULL DEFAULT 1"); }
        catch { /* column already exists */ }

        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE LocationNeighborhoods ADD COLUMN IsActive INTEGER NOT NULL DEFAULT 1"); }
        catch { /* column already exists */ }

        // ── Deactivate duplicate cities — keep the canonical (MIN Id) per (Province, NormalizedName) ──
        // Must run BEFORE unique-index creation or the index will fail on existing dupes.
        try
        {
            await db.Database.ExecuteSqlRawAsync(@"
                UPDATE LocationCities
                SET IsActive = 0
                WHERE IsActive = 1
                  AND NormalizedName != ''
                  AND Id NOT IN (
                      SELECT MIN(Id)
                      FROM LocationCities
                      WHERE IsActive = 1
                        AND NormalizedName != ''
                      GROUP BY Province, NormalizedName
                  )");
        }
        catch (Exception ex) { logger.LogWarning("City dedup update: {msg}", ex.Message); }

        // ── Deactivate duplicate neighborhoods — keep the canonical (MIN Id) per (City, NormalizedName) ──
        try
        {
            await db.Database.ExecuteSqlRawAsync(@"
                UPDATE LocationNeighborhoods
                SET IsActive = 0
                WHERE IsActive = 1
                  AND NormalizedName != ''
                  AND Id NOT IN (
                      SELECT MIN(Id)
                      FROM LocationNeighborhoods
                      WHERE IsActive = 1
                        AND NormalizedName != ''
                      GROUP BY City, NormalizedName
                  )");
        }
        catch (Exception ex) { logger.LogWarning("Neighborhood dedup update: {msg}", ex.Message); }

        // ── Transition indexes ────────────────────────────────────────────────────
        // Drop old non-filtered indexes (replaced by IsActive-scoped indexes below).
        try { await db.Database.ExecuteSqlRawAsync("DROP INDEX IF EXISTS IX_LocationCities_Name"); }
        catch { /* ignore */ }

        try { await db.Database.ExecuteSqlRawAsync("DROP INDEX IF EXISTS IX_LocationNeighborhoods_Name_City"); }
        catch { /* ignore */ }

        // Drop previous partial indexes that did NOT scope to IsActive=1.
        // They must be recreated with the correct filter.
        try { await db.Database.ExecuteSqlRawAsync("DROP INDEX IF EXISTS IX_LocationCities_Province_NormalizedName"); }
        catch { /* ignore */ }

        try { await db.Database.ExecuteSqlRawAsync("DROP INDEX IF EXISTS IX_LocationNeighborhoods_NormalizedName_City"); }
        catch { /* ignore */ }

        // Create unique indexes scoped to ACTIVE rows only.
        // This allows deactivated rows to coexist without blocking future active inserts.
        try
        {
            await db.Database.ExecuteSqlRawAsync(
                "CREATE UNIQUE INDEX IX_LocationCities_Province_NormalizedName_Active " +
                "ON LocationCities(Province, NormalizedName) " +
                "WHERE IsActive = 1 AND NormalizedName != ''");
            logger.LogInformation("Created unique index IX_LocationCities_Province_NormalizedName_Active");
        }
        catch (Exception ex) { logger.LogWarning("City unique index: {msg}", ex.Message); }

        try
        {
            await db.Database.ExecuteSqlRawAsync(
                "CREATE UNIQUE INDEX IX_LocationNeighborhoods_NormalizedName_City_Active " +
                "ON LocationNeighborhoods(NormalizedName, City) " +
                "WHERE IsActive = 1 AND NormalizedName != ''");
            logger.LogInformation("Created unique index IX_LocationNeighborhoods_NormalizedName_City_Active");
        }
        catch (Exception ex) { logger.LogWarning("Neighborhood unique index: {msg}", ex.Message); }

        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Users ADD COLUMN ProfileImageUrl TEXT"); }
        catch { /* column already exists */ }

        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Users ADD COLUMN TrialListingsUsed INTEGER NOT NULL DEFAULT 0"); }
        catch { /* column already exists */ }

        // Backfill TrialListingsUsed for existing User-role accounts.
        // We use EF Core to enumerate users so GUID formatting matches exactly
        // what EF Core stores in OwnerId on Properties.
        try
        {
            var trialUsers = await db.Set<Boioot.Domain.Entities.User>()
                .Where(u => u.Role == Boioot.Domain.Enums.UserRole.User && u.TrialListingsUsed == 0)
                .ToListAsync();

            foreach (var tu in trialUsers)
            {
                var ownerIdStr = tu.Id.ToString();
                var allTimeCount = await db.Set<Boioot.Domain.Entities.Property>()
                    .CountAsync(p => p.OwnerId == ownerIdStr);   // no IsDeleted filter — counts all-time
                if (allTimeCount > 0)
                {
                    tu.TrialListingsUsed = allTimeCount;
                }
            }

            if (trialUsers.Any(u => u.TrialListingsUsed > 0))
                await db.SaveChangesAsync();

            logger.LogInformation("TrialListingsUsed backfill completed for User-role accounts.");
        }
        catch (Exception ex) { logger.LogWarning("TrialListingsUsed backfill skipped: {msg}", ex.Message); }

        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Requests ADD COLUMN UserId TEXT"); }
        catch { /* column already exists */ }

        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Properties ADD COLUMN OwnerId TEXT"); }
        catch { /* column already exists */ }

        // New property detail columns
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Properties ADD COLUMN HallsCount INTEGER"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Properties ADD COLUMN PaymentType TEXT NOT NULL DEFAULT 'OneTime'"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Properties ADD COLUMN InstallmentsCount INTEGER"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Properties ADD COLUMN HasCommission INTEGER NOT NULL DEFAULT 0"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Properties ADD COLUMN CommissionType TEXT"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Properties ADD COLUMN CommissionValue REAL"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Properties ADD COLUMN OwnershipType TEXT"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Properties ADD COLUMN Floor TEXT"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Properties ADD COLUMN PropertyAge INTEGER"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Properties ADD COLUMN Features TEXT"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Properties ADD COLUMN VideoUrl TEXT"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Properties ADD COLUMN ViewCount INTEGER NOT NULL DEFAULT 0"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Projects ADD COLUMN Province TEXT"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Agents ADD COLUMN BrokerId TEXT"); }
        catch { /* column already exists */ }

        // ── Company business-profile fields (onboarding) ──────────────────────
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Companies ADD COLUMN Province TEXT"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Companies ADD COLUMN Neighborhood TEXT"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Companies ADD COLUMN WhatsApp TEXT"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Companies ADD COLUMN Latitude REAL"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Companies ADD COLUMN Longitude REAL"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Companies ADD COLUMN IsProfileComplete INTEGER NOT NULL DEFAULT 0"); }
        catch { /* column already exists */ }

        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Messages ADD COLUMN AttachmentData TEXT"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Messages ADD COLUMN AttachmentName TEXT"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE BlogPosts ADD COLUMN CoverImageAlt TEXT"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE BlogPosts ADD COLUMN Tags TEXT"); }
        catch { /* column already exists */ }

        // ── Blog SEO modes ────────────────────────────────────────────────────
        // Diagnostic: log actual DB path and column existence
        logger.LogInformation("DB connection string: {conn}", db.Database.GetConnectionString());
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE BlogPosts ADD COLUMN SeoTitleMode TEXT NOT NULL DEFAULT 'Auto'"); logger.LogInformation("MIGRATED: Added SeoTitleMode"); }
        catch (Exception ex) { logger.LogWarning("SeoTitleMode: {msg}", ex.Message); }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE BlogPosts ADD COLUMN SeoDescriptionMode TEXT NOT NULL DEFAULT 'Auto'"); logger.LogInformation("MIGRATED: Added SeoDescriptionMode"); }
        catch (Exception ex) { logger.LogWarning("SeoDescriptionMode: {msg}", ex.Message); }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE BlogPosts ADD COLUMN SlugMode TEXT NOT NULL DEFAULT 'Auto'"); logger.LogInformation("MIGRATED: Added SlugMode"); }
        catch (Exception ex) { logger.LogWarning("SlugMode: {msg}", ex.Message); }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE BlogPosts ADD COLUMN SeoMode TEXT NOT NULL DEFAULT 'Auto'"); logger.LogInformation("MIGRATED: Added SeoMode"); }
        catch (Exception ex) { logger.LogWarning("SeoMode: {msg}", ex.Message); }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE BlogPosts ADD COLUMN OgTitle TEXT"); logger.LogInformation("MIGRATED: Added OgTitle"); }
        catch (Exception ex) { logger.LogWarning("OgTitle: {msg}", ex.Message); }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE BlogPosts ADD COLUMN OgDescription TEXT"); logger.LogInformation("MIGRATED: Added OgDescription"); }
        catch (Exception ex) { logger.LogWarning("OgDescription: {msg}", ex.Message); }

        // ── Blog SEO Settings singleton table ─────────────────────────────────
        // Note: {{...}} double-brace escapes prevent EF Core's format-string parser from
        //       treating {PostTitle} etc. as positional parameters.
        try
        {
            await db.Database.ExecuteSqlRawAsync(@"
                CREATE TABLE IF NOT EXISTS BlogSeoSettings (
                    Id                               TEXT NOT NULL PRIMARY KEY,
                    SiteName                         TEXT NOT NULL DEFAULT 'بيوت',
                    DefaultPostSeoTitleTemplate      TEXT NOT NULL DEFAULT '{{PostTitle}} | {{SiteName}}',
                    DefaultPostSeoDescriptionTemplate TEXT NOT NULL DEFAULT '{{Excerpt}}',
                    DefaultBlogListSeoTitle          TEXT NOT NULL DEFAULT 'المدونة | بيوت',
                    DefaultBlogListSeoDescription    TEXT NOT NULL DEFAULT 'تصفح أحدث المقالات العقارية من بيوت سوريا'
                )");
        }
        catch { /* table already exists — safe to ignore */ }

        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE BlogSeoSettings ADD COLUMN DefaultBlogListSeoTitle TEXT NOT NULL DEFAULT 'المدونة | بيوت'"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE BlogSeoSettings ADD COLUMN DefaultBlogListSeoDescription TEXT NOT NULL DEFAULT 'تصفح أحدث المقالات العقارية من بيوت سوريا'"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE BlogSeoSettings ADD COLUMN DefaultOgTitleTemplate TEXT NOT NULL DEFAULT '{{PostTitle}} | {{SiteName}}'"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE BlogSeoSettings ADD COLUMN DefaultOgDescriptionTemplate TEXT NOT NULL DEFAULT '{{Excerpt}}'"); }
        catch { /* column already exists */ }

        // Seed singleton row if missing — {{...}} resolves to {PostTitle} etc. after EF Core processes
        try
        {
            await db.Database.ExecuteSqlRawAsync(
                "INSERT OR IGNORE INTO BlogSeoSettings (Id, SiteName, DefaultPostSeoTitleTemplate, DefaultPostSeoDescriptionTemplate, DefaultBlogListSeoTitle, DefaultBlogListSeoDescription) VALUES ('00000000-0000-0000-0000-000000000001', 'بيوت', '{{PostTitle}} | {{SiteName}}', '{{Excerpt}}', 'المدونة | بيوت', 'تصفح أحدث المقالات العقارية من بيوت سوريا')");
        }
        catch { /* row already exists or BlogSeoSettings missing — GetOrCreateSettingsAsync handles at runtime */ }


        // ── Dynamic RBAC — Phase 1: table creation ────────────────────────────
        // Creates Roles, Permissions, RolePermissions, UserRoles tables.
        // These tables are infrastructure only — NOT wired to the auth flow yet.
        // Seeding happens in DataSeeder.SeedRbacAsync().
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS Roles (
                Id        TEXT NOT NULL PRIMARY KEY,
                Name      TEXT NOT NULL,
                CreatedAt TEXT NOT NULL DEFAULT '',
                UpdatedAt TEXT NOT NULL DEFAULT ''
            )");

        await db.Database.ExecuteSqlRawAsync(
            "CREATE UNIQUE INDEX IF NOT EXISTS IX_Roles_Name ON Roles(Name)");

        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS Permissions (
                Id        TEXT NOT NULL PRIMARY KEY,
                Key       TEXT NOT NULL,
                CreatedAt TEXT NOT NULL DEFAULT '',
                UpdatedAt TEXT NOT NULL DEFAULT ''
            )");

        await db.Database.ExecuteSqlRawAsync(
            "CREATE UNIQUE INDEX IF NOT EXISTS IX_Permissions_Key ON Permissions(Key)");

        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS RolePermissions (
                RoleId       TEXT NOT NULL REFERENCES Roles(Id) ON DELETE CASCADE,
                PermissionId TEXT NOT NULL REFERENCES Permissions(Id) ON DELETE CASCADE,
                PRIMARY KEY (RoleId, PermissionId)
            )");

        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS UserRoles (
                UserId TEXT NOT NULL REFERENCES Users(Id) ON DELETE CASCADE,
                RoleId TEXT NOT NULL REFERENCES Roles(Id) ON DELETE CASCADE,
                PRIMARY KEY (UserId, RoleId)
            )");

        logger.LogInformation("Dynamic RBAC tables ensured (Phase 1)");

        // ── Phase A: Subscription architecture (tables + unique index + seed) ─
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS Plans (
                Id            TEXT NOT NULL PRIMARY KEY,
                Name          TEXT NOT NULL,
                ListingLimit  INTEGER NOT NULL DEFAULT 2,
                ProjectLimit  INTEGER NOT NULL DEFAULT 0,
                AgentLimit    INTEGER NOT NULL DEFAULT 0,
                FeaturedSlots INTEGER NOT NULL DEFAULT 0,
                PriceMonthly  REAL NOT NULL DEFAULT 0,
                PriceYearly   REAL NOT NULL DEFAULT 0,
                IsActive      INTEGER NOT NULL DEFAULT 1,
                CreatedAt     TEXT NOT NULL,
                UpdatedAt     TEXT NOT NULL
            )");

        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS Accounts (
                Id            TEXT NOT NULL PRIMARY KEY,
                Name          TEXT NOT NULL,
                AccountType   TEXT NOT NULL DEFAULT 'Individual',
                OwnerUserId   TEXT NOT NULL REFERENCES Users(Id),
                PlanId        TEXT REFERENCES Plans(Id),
                IsActive      INTEGER NOT NULL DEFAULT 1,
                CreatedAt     TEXT NOT NULL,
                UpdatedAt     TEXT NOT NULL
            )");

        // Remove old UNIQUE constraint on OwnerUserId (OwnerUserId concept retired)
        await db.Database.ExecuteSqlRawAsync(
            "DROP INDEX IF EXISTS ix_accounts_owneruserid");

        // ── Accounts: add new columns (OwnerUserId stays as orphaned column in SQLite) ──
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Accounts ADD COLUMN CreatedByUserId TEXT NOT NULL DEFAULT ''"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Accounts ADD COLUMN PrimaryAdminUserId TEXT"); }
        catch { /* column already exists */ }

        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS AccountUsers (
                AccountId            TEXT NOT NULL REFERENCES Accounts(Id) ON DELETE CASCADE,
                UserId               TEXT NOT NULL REFERENCES Users(Id) ON DELETE CASCADE,
                OrganizationUserRole TEXT NOT NULL DEFAULT 'Agent',
                IsPrimary            INTEGER NOT NULL DEFAULT 0,
                IsActive             INTEGER NOT NULL DEFAULT 1,
                JoinedAt             TEXT NOT NULL,
                PRIMARY KEY (AccountId, UserId)
            )");

        // AccountUsers column additions (for tables created in an older schema)
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE AccountUsers ADD COLUMN OrganizationUserRole TEXT NOT NULL DEFAULT 'Agent'"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE AccountUsers ADD COLUMN IsPrimary INTEGER NOT NULL DEFAULT 0"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE AccountUsers ADD COLUMN IsActive INTEGER NOT NULL DEFAULT 1"); }
        catch { /* column already exists */ }

        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS Subscriptions (
                Id          TEXT NOT NULL PRIMARY KEY,
                AccountId   TEXT NOT NULL REFERENCES Accounts(Id) ON DELETE CASCADE,
                PlanId      TEXT NOT NULL REFERENCES Plans(Id),
                Status      TEXT NOT NULL DEFAULT 'Trial',
                StartDate   TEXT NOT NULL,
                EndDate     TEXT,
                PaymentRef  TEXT,
                CreatedAt   TEXT NOT NULL,
                UpdatedAt   TEXT NOT NULL
            )");

        // Subscriptions.IsActive — explicit active flag (default true for existing rows)
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Subscriptions ADD COLUMN IsActive INTEGER NOT NULL DEFAULT 1"); }
        catch { /* column already exists */ }

        // ── Plan column additions ────────────────────────────────────────────
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Plans ADD COLUMN ImageLimitPerListing INTEGER NOT NULL DEFAULT 5"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Plans ADD COLUMN VideoAllowed INTEGER NOT NULL DEFAULT 0"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Plans ADD COLUMN AnalyticsAccess INTEGER NOT NULL DEFAULT 0"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Plans ADD COLUMN Features TEXT"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Plans ADD COLUMN Description TEXT"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Plans ADD COLUMN ApplicableAccountType TEXT"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Plans ADD COLUMN Rank INTEGER NOT NULL DEFAULT 0"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Plans ADD COLUMN DisplayOrder INTEGER NOT NULL DEFAULT 0"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Plans ADD COLUMN IsPublic INTEGER NOT NULL DEFAULT 1"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Plans ADD COLUMN IsRecommended INTEGER NOT NULL DEFAULT 0"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Plans ADD COLUMN PlanCategory TEXT"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Plans ADD COLUMN BillingMode TEXT NOT NULL DEFAULT 'InternalOnly'"); }
        catch { /* column already exists */ }

        // ── Subscriptions column additions ────────────────────────────────────
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Subscriptions ADD COLUMN PricingId TEXT"); }
        catch { /* column already exists */ }

        // Update seeded plans with full data
        await db.Database.ExecuteSqlRawAsync(@"
            UPDATE Plans SET
                ImageLimitPerListing  = 5,
                VideoAllowed          = 0,
                AnalyticsAccess       = 0,
                Description           = 'للمستخدمين الأفراد الذين يرغبون في نشر إعلانات محدودة',
                ApplicableAccountType = 'Individual',
                Features              = '[""2 إعلانات شهرياً"",""5 صور لكل إعلان"",""بحث وتصفح عادي""]'
            WHERE Id = '00000001-0000-0000-0000-000000000000'");

        await db.Database.ExecuteSqlRawAsync(@"
            UPDATE Plans SET
                ImageLimitPerListing  = 10,
                VideoAllowed          = 0,
                AnalyticsAccess       = 0,
                Description           = 'للمكاتب العقارية الصغيرة والوسيطة',
                ApplicableAccountType = 'Office',
                Features              = '[""5 إعلانات شهرياً"",""10 صور لكل إعلان"",""3 وكلاء"",""إعلان مميز واحد"",""دعم فني""]'
            WHERE Id = '00000002-0000-0000-0000-000000000000'");

        await db.Database.ExecuteSqlRawAsync(@"
            UPDATE Plans SET
                ImageLimitPerListing  = 20,
                VideoAllowed          = 1,
                AnalyticsAccess       = 1,
                Description           = 'للمكاتب والشركات العقارية المتوسطة والكبيرة',
                ApplicableAccountType = NULL,
                Features              = '[""20 إعلاناً شهرياً"",""20 صورة لكل إعلان"",""رفع فيديو"",""10 وكلاء"",""5 إعلانات مميزة"",""لوحة إحصائيات"",""2 مشروع""]'
            WHERE Id = '00000003-0000-0000-0000-000000000000'");

        await db.Database.ExecuteSqlRawAsync(@"
            UPDATE Plans SET
                ImageLimitPerListing  = -1,
                VideoAllowed          = 1,
                AnalyticsAccess       = 1,
                Description           = 'للشركات الكبرى وشركات التطوير العقاري',
                ApplicableAccountType = 'Company',
                Features              = '[""إعلانات غير محدودة"",""صور غير محدودة"",""رفع فيديو"",""وكلاء غير محدودون"",""إعلانات مميزة 20"",""لوحة إحصائيات متقدمة"",""مشاريع غير محدودة"",""دعم أولوية""]'
            WHERE Id = '00000004-0000-0000-0000-000000000000'");

        // ── Seed Plan.Rank (idempotent — runs every startup) ─────────────────
        // Individual plans: 0-3.   Professional plans: 10-14.
        await db.Database.ExecuteSqlRawAsync(@"
            UPDATE Plans SET Rank = 0  WHERE Id = '00000001-0000-0000-0000-000000000000';
            UPDATE Plans SET Rank = 1  WHERE Id = '00000002-0000-0000-0000-000000000000';
            UPDATE Plans SET Rank = 2  WHERE Id = '00000003-0000-0000-0000-000000000000';
            UPDATE Plans SET Rank = 3  WHERE Id = '00000004-0000-0000-0000-000000000000';
            UPDATE Plans SET Rank = 10 WHERE Id = '00000005-0000-0000-0000-000000000000';
            UPDATE Plans SET Rank = 11 WHERE Id = '00000006-0000-0000-0000-000000000000';
            UPDATE Plans SET Rank = 12 WHERE Id = '00000007-0000-0000-0000-000000000000';
            UPDATE Plans SET Rank = 13 WHERE Id = '00000008-0000-0000-0000-000000000000';
            UPDATE Plans SET Rank = 14 WHERE Id = '00000009-0000-0000-0000-000000000000'");

        // ── Seed Plan.DisplayOrder + PlanCategory (idempotent) ────────────────
        // Individual plans (01–04): order 1–4, category Individual
        // Professional plans (05–09): order 10–14, category Business
        await db.Database.ExecuteSqlRawAsync(@"
            UPDATE Plans SET DisplayOrder = 1,  PlanCategory = 'Individual' WHERE Id = '00000001-0000-0000-0000-000000000000';
            UPDATE Plans SET DisplayOrder = 2,  PlanCategory = 'Individual' WHERE Id = '00000002-0000-0000-0000-000000000000';
            UPDATE Plans SET DisplayOrder = 3,  PlanCategory = 'Individual' WHERE Id = '00000003-0000-0000-0000-000000000000';
            UPDATE Plans SET DisplayOrder = 4,  PlanCategory = 'Individual' WHERE Id = '00000004-0000-0000-0000-000000000000';
            UPDATE Plans SET DisplayOrder = 10, PlanCategory = 'Business'   WHERE Id = '00000005-0000-0000-0000-000000000000';
            UPDATE Plans SET DisplayOrder = 11, PlanCategory = 'Business'   WHERE Id = '00000006-0000-0000-0000-000000000000';
            UPDATE Plans SET DisplayOrder = 12, PlanCategory = 'Business'   WHERE Id = '00000007-0000-0000-0000-000000000000';
            UPDATE Plans SET DisplayOrder = 13, PlanCategory = 'Business'   WHERE Id = '00000008-0000-0000-0000-000000000000';
            UPDATE Plans SET DisplayOrder = 14, PlanCategory = 'Business'   WHERE Id = '00000009-0000-0000-0000-000000000000'");

        // Property.AccountId — future ownership source (replaces CompanyId in Phase C)
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Properties ADD COLUMN AccountId TEXT"); }
        catch { /* column already exists */ }

        // ── Audit fields (server-side only — never from request body) ─────────
        // CreatedByUserId / CreatedByRole: who created the listing and in what role.
        // CreatedByCompanyId: the creator's company, null for personal listings.
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Properties ADD COLUMN CreatedByUserId TEXT NOT NULL DEFAULT ''"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Properties ADD COLUMN CreatedByRole TEXT NOT NULL DEFAULT ''"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Properties ADD COLUMN CreatedByCompanyId TEXT"); }
        catch { /* column already exists */ }

        // ── Phase B: FeatureDefinitions catalog ──────────────────────────────
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS FeatureDefinitions (
                Id           TEXT NOT NULL PRIMARY KEY,
                Key          TEXT NOT NULL,
                Name         TEXT NOT NULL,
                Description  TEXT,
                FeatureGroup TEXT,
                IsActive     INTEGER NOT NULL DEFAULT 1,
                CreatedAt    TEXT NOT NULL,
                UpdatedAt    TEXT NOT NULL
            )");

        await db.Database.ExecuteSqlRawAsync(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_featuredefinitions_key ON FeatureDefinitions(Key)");

        await db.Database.ExecuteSqlRawAsync(
            "CREATE INDEX IF NOT EXISTS ix_featuredefinitions_group ON FeatureDefinitions(FeatureGroup)");

        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS LimitDefinitions (
                Id              TEXT NOT NULL PRIMARY KEY,
                Key             TEXT NOT NULL,
                Name            TEXT NOT NULL,
                Description     TEXT,
                Unit            TEXT,
                ValueType       TEXT NOT NULL DEFAULT 'integer',
                AppliesToScope  TEXT,
                IsActive        INTEGER NOT NULL DEFAULT 1,
                CreatedAt       TEXT NOT NULL,
                UpdatedAt       TEXT NOT NULL
            )");

        await db.Database.ExecuteSqlRawAsync(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_limitdefinitions_key ON LimitDefinitions(Key)");

        await db.Database.ExecuteSqlRawAsync(
            "CREATE INDEX IF NOT EXISTS ix_limitdefinitions_scope ON LimitDefinitions(AppliesToScope)");

        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS PlanFeatures (
                Id                  TEXT NOT NULL PRIMARY KEY,
                SubscriptionPlanId  TEXT NOT NULL REFERENCES Plans(Id) ON DELETE CASCADE,
                FeatureDefinitionId TEXT NOT NULL REFERENCES FeatureDefinitions(Id) ON DELETE RESTRICT,
                IsEnabled           INTEGER NOT NULL DEFAULT 1,
                CreatedAt           TEXT NOT NULL,
                UpdatedAt           TEXT NOT NULL
            )");

        // Rename PlanId → SubscriptionPlanId if the table was created with the old column name
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE PlanFeatures RENAME COLUMN PlanId TO SubscriptionPlanId"); }
        catch { /* column already renamed or did not exist */ }

        // Drop old indexes that referenced PlanId, then recreate with correct name
        await db.Database.ExecuteSqlRawAsync("DROP INDEX IF EXISTS ix_planfeatures_plan_feature");
        await db.Database.ExecuteSqlRawAsync("DROP INDEX IF EXISTS ix_planfeatures_planid");

        await db.Database.ExecuteSqlRawAsync(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_planfeatures_plan_feature ON PlanFeatures(SubscriptionPlanId, FeatureDefinitionId)");

        await db.Database.ExecuteSqlRawAsync(
            "CREATE INDEX IF NOT EXISTS ix_planfeatures_subscriptionplanid ON PlanFeatures(SubscriptionPlanId)");

        await db.Database.ExecuteSqlRawAsync(
            "CREATE INDEX IF NOT EXISTS ix_planfeatures_featureid ON PlanFeatures(FeatureDefinitionId)");

        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS PlanLimits (
                Id                 TEXT NOT NULL PRIMARY KEY,
                SubscriptionPlanId TEXT NOT NULL REFERENCES Plans(Id) ON DELETE CASCADE,
                LimitDefinitionId  TEXT NOT NULL REFERENCES LimitDefinitions(Id) ON DELETE RESTRICT,
                Value              REAL NOT NULL,
                CreatedAt          TEXT NOT NULL,
                UpdatedAt          TEXT NOT NULL
            )");

        await db.Database.ExecuteSqlRawAsync(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_planlimits_plan_limit ON PlanLimits(SubscriptionPlanId, LimitDefinitionId)");

        await db.Database.ExecuteSqlRawAsync(
            "CREATE INDEX IF NOT EXISTS ix_planlimits_subscriptionplanid ON PlanLimits(SubscriptionPlanId)");

        await db.Database.ExecuteSqlRawAsync(
            "CREATE INDEX IF NOT EXISTS ix_planlimits_limitdefinitionid ON PlanLimits(LimitDefinitionId)");

        // ── PlanPricing: normalized per-plan pricing (monthly/yearly) ──────────
        // Fully isolated from PlanLimits, PlanFeatures, and enforcement logic.
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS PlanPricings (
                Id               TEXT NOT NULL PRIMARY KEY,
                PlanId           TEXT NOT NULL REFERENCES Plans(Id) ON DELETE CASCADE,
                BillingCycle     TEXT NOT NULL,
                PriceAmount      REAL NOT NULL DEFAULT 0,
                CurrencyCode     TEXT NOT NULL DEFAULT 'SYP',
                IsActive         INTEGER NOT NULL DEFAULT 1,
                IsPublic         INTEGER NOT NULL DEFAULT 1,
                ExternalProvider TEXT,
                ExternalPriceId  TEXT,
                CreatedAt        TEXT NOT NULL,
                UpdatedAt        TEXT NOT NULL
            )");

        await db.Database.ExecuteSqlRawAsync(
            "CREATE INDEX IF NOT EXISTS ix_planpricing_planid ON PlanPricings(PlanId)");

        await db.Database.ExecuteSqlRawAsync(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_planpricing_plan_cycle ON PlanPricings(PlanId, BillingCycle, CurrencyCode)");

        // ── Billing tables ────────────────────────────────────────────────────
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS Invoices (
                Id            TEXT NOT NULL PRIMARY KEY,
                UserId        TEXT NOT NULL,
                PlanPricingId TEXT NOT NULL,
                Amount        REAL NOT NULL DEFAULT 0,
                Currency      TEXT NOT NULL DEFAULT 'SYP',
                Status        INTEGER NOT NULL DEFAULT 0,
                ProviderName  TEXT NOT NULL DEFAULT 'internal',
                ExternalRef   TEXT,
                AdminNote     TEXT,
                CreatedAt     TEXT NOT NULL,
                UpdatedAt     TEXT NOT NULL
            )");

        await db.Database.ExecuteSqlRawAsync(
            "CREATE INDEX IF NOT EXISTS ix_invoices_userid ON Invoices(UserId)");

        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS PaymentProofs (
                Id        TEXT NOT NULL PRIMARY KEY,
                InvoiceId TEXT NOT NULL UNIQUE,
                ImageUrl  TEXT NOT NULL DEFAULT '',
                Notes     TEXT,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NOT NULL,
                FOREIGN KEY (InvoiceId) REFERENCES Invoices(Id)
            )");

        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Invoices ADD COLUMN ExpiresAt TEXT"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Invoices ADD COLUMN ApprovedBy TEXT"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Invoices ADD COLUMN ApprovedAt TEXT"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Invoices ADD COLUMN RejectedBy TEXT"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Invoices ADD COLUMN RejectedAt TEXT"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Invoices ADD COLUMN StripeSessionUrl TEXT"); }
        catch { /* column already exists */ }

        // ── Force WAL checkpoint so ALL connections see schema changes ──────────
        // After ALTER TABLE, WAL frames must be merged into the main DB file so that
        // connection-pool connections (opened before migrations ran) see new columns.
        try
        {
            await db.Database.ExecuteSqlRawAsync("PRAGMA wal_checkpoint(FULL)");
            logger.LogInformation("WAL checkpoint completed — schema changes are visible to all connections");
        }
        catch (Exception ex)
        {
            logger.LogWarning("WAL checkpoint failed (non-fatal): {msg}", ex.Message);
        }

        // Clear the ADO.NET connection pool so all future EF Core connections are fresh
        // and read the updated schema from the main DB file.
        try
        {
            Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
            logger.LogInformation("SQLite connection pool cleared — all future connections will use updated schema");
        }
        catch (Exception ex)
        {
            logger.LogWarning("ClearAllPools failed (non-fatal): {msg}", ex.Message);
        }

        // Seed default Plans (ListingLimit: -1 = unlimited)
        // ALL NOT NULL columns must be specified — INSERT OR IGNORE silently drops rows with missing NOT NULL values.
        // Column names: PriceMonthly/PriceYearly match HasColumnName() in PlanConfiguration.
        var nowPlan = DateTime.UtcNow.ToString("O");
        await db.Database.ExecuteSqlRawAsync(@"
            INSERT OR IGNORE INTO Plans (Id, Name, ListingLimit, ProjectLimit, AgentLimit, FeaturedSlots, PriceMonthly, PriceYearly, IsActive, BillingMode, Rank, DisplayOrder, IsPublic, IsRecommended, CreatedAt, UpdatedAt)
            VALUES
              ('00000001-0000-0000-0000-000000000000', 'Free',       2,  0,  0,  0,    0,    0, 1, 'InternalOnly', 0, 0, 1, 0, {0}, {0}),
              ('00000002-0000-0000-0000-000000000000', 'Silver',     5,  0,  3,  1, 1500, 1200, 1, 'InternalOnly', 1, 1, 1, 0, {0}, {0}),
              ('00000003-0000-0000-0000-000000000000', 'Gold',      20,  2, 10,  5, 3500, 2800, 1, 'InternalOnly', 2, 2, 1, 0, {0}, {0}),
              ('00000004-0000-0000-0000-000000000000', 'Platinum',  -1, -1, -1, 20, 7000, 5600, 1, 'InternalOnly', 3, 3, 1, 0, {0}, {0})",
            nowPlan);

        // ── Subscription catalog seed ──────────────────────────────────────────
        // All GUIDs are fixed so seeds are fully idempotent (INSERT OR IGNORE).
        // Plans 00000005-00000009 are the new normalized subscription plans.
        await db.Database.ExecuteSqlRawAsync(@"
            INSERT OR IGNORE INTO Plans (Id, Name, ListingLimit, ProjectLimit, AgentLimit, FeaturedSlots, PriceMonthly, PriceYearly, IsActive, BillingMode, Rank, DisplayOrder, IsPublic, IsRecommended, CreatedAt, UpdatedAt)
            VALUES
              ('00000005-0000-0000-0000-000000000000', 'OwnerPro',        5,   0,   0,  0,  1000,  9000, 1, 'InternalOnly', 10, 0, 1, 0, {0}, {0}),
              ('00000006-0000-0000-0000-000000000000', 'AgentPro',       20,   0,   3,  2,  2500, 22000, 1, 'InternalOnly', 11, 1, 1, 0, {0}, {0}),
              ('00000007-0000-0000-0000-000000000000', 'AgentPremium',   50,   5,  10,  5,  5000, 44000, 1, 'InternalOnly', 12, 2, 1, 0, {0}, {0}),
              ('00000008-0000-0000-0000-000000000000', 'OfficeStarter', 100,  10,  20, 10, 10000, 88000, 1, 'InternalOnly', 13, 3, 1, 0, {0}, {0}),
              ('00000009-0000-0000-0000-000000000000', 'BusinessGrowth',  -1,  -1,  -1, 20, 20000,176000, 1, 'InternalOnly', 14, 4, 1, 0, {0}, {0})",
            nowPlan);

        // FeatureDefinitions — stable keys, never rename after creation
        await db.Database.ExecuteSqlRawAsync(@"
            INSERT OR IGNORE INTO FeatureDefinitions (Id, Key, Name, Description, FeatureGroup, IsActive, CreatedAt, UpdatedAt)
            VALUES
              ('fd000001-0000-0000-0000-000000000000', 'analytics_dashboard', 'لوحة التحليلات',    'وصول إلى إحصائيات وأداء الإعلانات', 'analytics', 1, {0}, {0}),
              ('fd000002-0000-0000-0000-000000000000', 'priority_support',    'دعم ذو أولوية',     'أولوية الوصول لفريق الدعم الفني',    'support',   1, {0}, {0}),
              ('fd000003-0000-0000-0000-000000000000', 'featured_listings',   'إعلانات مميزة',     'إبراز الإعلانات في نتائج البحث',     'listing',   1, {0}, {0})",
            nowPlan);

        // LimitDefinitions — stable keys, never rename after creation
        await db.Database.ExecuteSqlRawAsync(@"
            INSERT OR IGNORE INTO LimitDefinitions (Id, Key, Name, Description, Unit, ValueType, AppliesToScope, IsActive, CreatedAt, UpdatedAt)
            VALUES
              ('add00001-0000-0000-0000-000000000000', 'max_active_listings', 'الحد الأقصى للإعلانات النشطة', 'عدد الإعلانات المسموح بها في نفس الوقت',  'إعلان', 'integer', 'account', 1, {0}, {0}),
              ('add00002-0000-0000-0000-000000000000', 'max_agents',          'الحد الأقصى للوكلاء',          'عدد الوكلاء المسموح بهم في الحساب',       'وكيل',  'integer', 'account', 1, {0}, {0}),
              ('add00003-0000-0000-0000-000000000000', 'max_projects',        'الحد الأقصى للمشاريع',         'عدد المشاريع العقارية المسموح بها',        'مشروع', 'integer', 'account', 1, {0}, {0})",
            nowPlan);

        // PlanFeatures — one row per (plan, feature); IsEnabled toggles access
        // Plans:    05=OwnerPro  06=AgentPro  07=AgentPremium  08=OfficeStarter  09=BusinessGrowth
        // Features: fd1=analytics  fd2=priority_support  fd3=featured_listings
        await db.Database.ExecuteSqlRawAsync(@"
            INSERT OR IGNORE INTO PlanFeatures (Id, SubscriptionPlanId, FeatureDefinitionId, IsEnabled, CreatedAt, UpdatedAt)
            VALUES
              ('ce000001-0000-0000-0000-000000000000', '00000005-0000-0000-0000-000000000000', 'fd000001-0000-0000-0000-000000000000', 1, {0}, {0}),
              ('ce000002-0000-0000-0000-000000000000', '00000005-0000-0000-0000-000000000000', 'fd000002-0000-0000-0000-000000000000', 0, {0}, {0}),
              ('ce000003-0000-0000-0000-000000000000', '00000005-0000-0000-0000-000000000000', 'fd000003-0000-0000-0000-000000000000', 0, {0}, {0}),
              ('ce000004-0000-0000-0000-000000000000', '00000006-0000-0000-0000-000000000000', 'fd000001-0000-0000-0000-000000000000', 1, {0}, {0}),
              ('ce000005-0000-0000-0000-000000000000', '00000006-0000-0000-0000-000000000000', 'fd000002-0000-0000-0000-000000000000', 0, {0}, {0}),
              ('ce000006-0000-0000-0000-000000000000', '00000006-0000-0000-0000-000000000000', 'fd000003-0000-0000-0000-000000000000', 0, {0}, {0}),
              ('ce000007-0000-0000-0000-000000000000', '00000007-0000-0000-0000-000000000000', 'fd000001-0000-0000-0000-000000000000', 1, {0}, {0}),
              ('ce000008-0000-0000-0000-000000000000', '00000007-0000-0000-0000-000000000000', 'fd000002-0000-0000-0000-000000000000', 0, {0}, {0}),
              ('ce000009-0000-0000-0000-000000000000', '00000007-0000-0000-0000-000000000000', 'fd000003-0000-0000-0000-000000000000', 1, {0}, {0}),
              ('ce00000a-0000-0000-0000-000000000000', '00000008-0000-0000-0000-000000000000', 'fd000001-0000-0000-0000-000000000000', 1, {0}, {0}),
              ('ce00000b-0000-0000-0000-000000000000', '00000008-0000-0000-0000-000000000000', 'fd000002-0000-0000-0000-000000000000', 1, {0}, {0}),
              ('ce00000c-0000-0000-0000-000000000000', '00000008-0000-0000-0000-000000000000', 'fd000003-0000-0000-0000-000000000000', 1, {0}, {0}),
              ('ce00000d-0000-0000-0000-000000000000', '00000009-0000-0000-0000-000000000000', 'fd000001-0000-0000-0000-000000000000', 1, {0}, {0}),
              ('ce00000e-0000-0000-0000-000000000000', '00000009-0000-0000-0000-000000000000', 'fd000002-0000-0000-0000-000000000000', 1, {0}, {0}),
              ('ce00000f-0000-0000-0000-000000000000', '00000009-0000-0000-0000-000000000000', 'fd000003-0000-0000-0000-000000000000', 1, {0}, {0})",
            nowPlan);

        // Correct any previously seeded IsEnabled values that differ from the current spec.
        // These UPDATEs are idempotent — they set the exact intended value every startup.
        // OwnerPro: analytics ON
        await db.Database.ExecuteSqlRawAsync(
            "UPDATE PlanFeatures SET IsEnabled = 1 WHERE Id = 'ce000001-0000-0000-0000-000000000000'");
        // AgentPro: analytics ON
        await db.Database.ExecuteSqlRawAsync(
            "UPDATE PlanFeatures SET IsEnabled = 1 WHERE Id = 'ce000004-0000-0000-0000-000000000000'");
        // AgentPro: featured_listings OFF
        await db.Database.ExecuteSqlRawAsync(
            "UPDATE PlanFeatures SET IsEnabled = 0 WHERE Id = 'ce000006-0000-0000-0000-000000000000'");

        // PlanLimits — one row per (plan, limit); Value: -1 = unlimited
        await db.Database.ExecuteSqlRawAsync(@"
            INSERT OR IGNORE INTO PlanLimits (Id, SubscriptionPlanId, LimitDefinitionId, Value, CreatedAt, UpdatedAt)
            VALUES
              ('c1000001-0000-0000-0000-000000000000', '00000005-0000-0000-0000-000000000000', 'add00001-0000-0000-0000-000000000000',   5, {0}, {0}),
              ('c1000002-0000-0000-0000-000000000000', '00000005-0000-0000-0000-000000000000', 'add00002-0000-0000-0000-000000000000',   0, {0}, {0}),
              ('c1000003-0000-0000-0000-000000000000', '00000005-0000-0000-0000-000000000000', 'add00003-0000-0000-0000-000000000000',   0, {0}, {0}),
              ('c1000004-0000-0000-0000-000000000000', '00000006-0000-0000-0000-000000000000', 'add00001-0000-0000-0000-000000000000',  20, {0}, {0}),
              ('c1000005-0000-0000-0000-000000000000', '00000006-0000-0000-0000-000000000000', 'add00002-0000-0000-0000-000000000000',   3, {0}, {0}),
              ('c1000006-0000-0000-0000-000000000000', '00000006-0000-0000-0000-000000000000', 'add00003-0000-0000-0000-000000000000',   0, {0}, {0}),
              ('c1000007-0000-0000-0000-000000000000', '00000007-0000-0000-0000-000000000000', 'add00001-0000-0000-0000-000000000000',  50, {0}, {0}),
              ('c1000008-0000-0000-0000-000000000000', '00000007-0000-0000-0000-000000000000', 'add00002-0000-0000-0000-000000000000',  10, {0}, {0}),
              ('c1000009-0000-0000-0000-000000000000', '00000007-0000-0000-0000-000000000000', 'add00003-0000-0000-0000-000000000000',   5, {0}, {0}),
              ('c100000a-0000-0000-0000-000000000000', '00000008-0000-0000-0000-000000000000', 'add00001-0000-0000-0000-000000000000', 100, {0}, {0}),
              ('c100000b-0000-0000-0000-000000000000', '00000008-0000-0000-0000-000000000000', 'add00002-0000-0000-0000-000000000000',  20, {0}, {0}),
              ('c100000c-0000-0000-0000-000000000000', '00000008-0000-0000-0000-000000000000', 'add00003-0000-0000-0000-000000000000',  10, {0}, {0}),
              ('c100000d-0000-0000-0000-000000000000', '00000009-0000-0000-0000-000000000000', 'add00001-0000-0000-0000-000000000000',  -1, {0}, {0}),
              ('c100000e-0000-0000-0000-000000000000', '00000009-0000-0000-0000-000000000000', 'add00002-0000-0000-0000-000000000000',  -1, {0}, {0}),
              ('c100000f-0000-0000-0000-000000000000', '00000009-0000-0000-0000-000000000000', 'add00003-0000-0000-0000-000000000000',  -1, {0}, {0})",
            nowPlan);

        // ── PlanPricing seed data ──────────────────────────────────────────────
        // Cleanup: remove any rows with non-hex GUID prefix 'pp' inserted by an
        // earlier schema version. Safe to run multiple times — no-op if already clean.
        await db.Database.ExecuteSqlRawAsync("DELETE FROM PlanPricings WHERE Id LIKE 'pp%'");

        // IDs: ef000001-ef000011 (fixed, valid hex, fully idempotent via INSERT OR IGNORE).
        // BillingCycle: 'Monthly' or 'Yearly'. Yearly = total annual price.
        // Free plan has only Monthly at 0 SYP (shows on public pricing page).
        // Plans 00000005-00000009 yearly prices match the existing Plans.PriceYearly seed.
        await db.Database.ExecuteSqlRawAsync(@"
            INSERT OR IGNORE INTO PlanPricings (Id, PlanId, BillingCycle, PriceAmount, CurrencyCode, IsActive, IsPublic, ExternalProvider, ExternalPriceId, CreatedAt, UpdatedAt)
            VALUES
              ('ef000001-0000-0000-0000-000000000000', '00000001-0000-0000-0000-000000000000', 'Monthly',    0, 'SYP', 1, 1, NULL, NULL, {0}, {0}),
              ('ef000002-0000-0000-0000-000000000000', '00000002-0000-0000-0000-000000000000', 'Monthly', 1500, 'SYP', 1, 1, NULL, NULL, {0}, {0}),
              ('ef000003-0000-0000-0000-000000000000', '00000002-0000-0000-0000-000000000000', 'Yearly', 15000, 'SYP', 1, 1, NULL, NULL, {0}, {0}),
              ('ef000004-0000-0000-0000-000000000000', '00000003-0000-0000-0000-000000000000', 'Monthly', 3500, 'SYP', 1, 1, NULL, NULL, {0}, {0}),
              ('ef000005-0000-0000-0000-000000000000', '00000003-0000-0000-0000-000000000000', 'Yearly', 35000, 'SYP', 1, 1, NULL, NULL, {0}, {0}),
              ('ef000006-0000-0000-0000-000000000000', '00000004-0000-0000-0000-000000000000', 'Monthly', 7000, 'SYP', 1, 1, NULL, NULL, {0}, {0}),
              ('ef000007-0000-0000-0000-000000000000', '00000004-0000-0000-0000-000000000000', 'Yearly', 70000, 'SYP', 1, 1, NULL, NULL, {0}, {0}),
              ('ef000008-0000-0000-0000-000000000000', '00000005-0000-0000-0000-000000000000', 'Monthly',  1000, 'SYP', 1, 1, NULL, NULL, {0}, {0}),
              ('ef000009-0000-0000-0000-000000000000', '00000005-0000-0000-0000-000000000000', 'Yearly',   9000, 'SYP', 1, 1, NULL, NULL, {0}, {0}),
              ('ef00000a-0000-0000-0000-000000000000', '00000006-0000-0000-0000-000000000000', 'Monthly',  2500, 'SYP', 1, 1, NULL, NULL, {0}, {0}),
              ('ef00000b-0000-0000-0000-000000000000', '00000006-0000-0000-0000-000000000000', 'Yearly',  22000, 'SYP', 1, 1, NULL, NULL, {0}, {0}),
              ('ef00000c-0000-0000-0000-000000000000', '00000007-0000-0000-0000-000000000000', 'Monthly',  5000, 'SYP', 1, 1, NULL, NULL, {0}, {0}),
              ('ef00000d-0000-0000-0000-000000000000', '00000007-0000-0000-0000-000000000000', 'Yearly',  44000, 'SYP', 1, 1, NULL, NULL, {0}, {0}),
              ('ef00000e-0000-0000-0000-000000000000', '00000008-0000-0000-0000-000000000000', 'Monthly', 10000, 'SYP', 1, 1, NULL, NULL, {0}, {0}),
              ('ef00000f-0000-0000-0000-000000000000', '00000008-0000-0000-0000-000000000000', 'Yearly',  88000, 'SYP', 1, 1, NULL, NULL, {0}, {0}),
              ('ef000010-0000-0000-0000-000000000000', '00000009-0000-0000-0000-000000000000', 'Monthly', 20000, 'SYP', 1, 1, NULL, NULL, {0}, {0}),
              ('ef000011-0000-0000-0000-000000000000', '00000009-0000-0000-0000-000000000000', 'Yearly', 176000, 'SYP', 1, 1, NULL, NULL, {0}, {0})",
            nowPlan);

        // ══════════════════════════════════════════════════════════════════════════
        // PHASE A v2 — Subscription system completion (incremental, idempotent)
        // ══════════════════════════════════════════════════════════════════════════

        // ── New columns ────────────────────────────────────────────────────────
        // Plans.Code — stable machine-readable slug for enforcement code references
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Plans ADD COLUMN Code TEXT"); }
        catch { /* already exists */ }

        // Subscriptions.AutoRenew — whether the subscription auto-renews
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Subscriptions ADD COLUMN AutoRenew INTEGER NOT NULL DEFAULT 1"); }
        catch { /* already exists */ }

        // ── Rename existing plans to align with role terminology ───────────────
        // Safe: only the display Name changes; Id/FK relationships are unaffected.
        await db.Database.ExecuteSqlRawAsync(@"
            UPDATE Plans SET Name = 'BrokerPro'    WHERE Id = '00000006-0000-0000-0000-000000000000' AND Name = 'AgentPro';
            UPDATE Plans SET Name = 'BrokerPremium' WHERE Id = '00000007-0000-0000-0000-000000000000' AND Name = 'AgentPremium';
            UPDATE Plans SET Name = 'OfficeGrowth'  WHERE Id = '00000009-0000-0000-0000-000000000000' AND Name = 'BusinessGrowth'");

        // ── Fix ApplicableAccountType for plans 06, 07, 08, 09 ────────────────
        // 06 BrokerPro + 07 BrokerPremium: Broker is an Individual account type.
        // 08 OfficeStarter + 09 OfficeGrowth: RealEstateOffice is an Office account type.
        await db.Database.ExecuteSqlRawAsync(@"
            UPDATE Plans SET ApplicableAccountType = 'Individual' WHERE Id = '00000006-0000-0000-0000-000000000000';
            UPDATE Plans SET ApplicableAccountType = 'Individual' WHERE Id = '00000007-0000-0000-0000-000000000000';
            UPDATE Plans SET ApplicableAccountType = 'Office'     WHERE Id = '00000008-0000-0000-0000-000000000000';
            UPDATE Plans SET ApplicableAccountType = 'Office'     WHERE Id = '00000009-0000-0000-0000-000000000000'");

        // ── Seed Code (slug) for all 9 existing plans (idempotent) ────────────
        await db.Database.ExecuteSqlRawAsync(@"
            UPDATE Plans SET Code = 'free_user'         WHERE Id = '00000001-0000-0000-0000-000000000000';
            UPDATE Plans SET Code = 'silver'            WHERE Id = '00000002-0000-0000-0000-000000000000';
            UPDATE Plans SET Code = 'gold'              WHERE Id = '00000003-0000-0000-0000-000000000000';
            UPDATE Plans SET Code = 'platinum'          WHERE Id = '00000004-0000-0000-0000-000000000000';
            UPDATE Plans SET Code = 'owner_pro'         WHERE Id = '00000005-0000-0000-0000-000000000000';
            UPDATE Plans SET Code = 'broker_pro'        WHERE Id = '00000006-0000-0000-0000-000000000000';
            UPDATE Plans SET Code = 'broker_premium'    WHERE Id = '00000007-0000-0000-0000-000000000000';
            UPDATE Plans SET Code = 'office_starter'    WHERE Id = '00000008-0000-0000-0000-000000000000';
            UPDATE Plans SET Code = 'office_growth'     WHERE Id = '00000009-0000-0000-0000-000000000000'");

        // ── New FeatureDefinition: project_management ──────────────────────────
        await db.Database.ExecuteSqlRawAsync(@"
            INSERT OR IGNORE INTO FeatureDefinitions (Id, Key, Name, Description, FeatureGroup, IsActive, CreatedAt, UpdatedAt)
            VALUES ('fd000004-0000-0000-0000-000000000000', 'project_management', 'إدارة المشاريع', 'أدوات إنشاء وإدارة المشاريع العقارية والوحدات', 'projects', 1, {0}, {0})",
            nowPlan);

        // ── New LimitDefinition: max_project_units ────────────────────────────
        await db.Database.ExecuteSqlRawAsync(@"
            INSERT OR IGNORE INTO LimitDefinitions (Id, Key, Name, Description, Unit, ValueType, AppliesToScope, IsActive, CreatedAt, UpdatedAt)
            VALUES ('add00004-0000-0000-0000-000000000000', 'max_project_units', 'الحد الأقصى لوحدات المشروع', 'إجمالي الوحدات العقارية المسموح بها عبر جميع المشاريع', 'وحدة', 'integer', 'account', 1, {0}, {0})",
            nowPlan);

        // ── New plans: DeveloperBusiness (0a) + DeveloperPremium (0b) ─────────
        // GUIDs 0000000a and 0000000b — fully fixed and idempotent.
        // ApplicableAccountType = 'Company' (DeveloperCompany maps to AccountType.Company).
        await db.Database.ExecuteSqlRawAsync(@"
            INSERT OR IGNORE INTO Plans (Id, Name, Code, ListingLimit, ProjectLimit, AgentLimit, FeaturedSlots, PriceMonthly, PriceYearly, IsActive, BillingMode, Rank, DisplayOrder, IsPublic, IsRecommended, ApplicableAccountType, PlanCategory, CreatedAt, UpdatedAt)
            VALUES
              ('0000000a-0000-0000-0000-000000000000', 'DeveloperBusiness', 'developer_business',  50, 5, 10, 10, 15000, 130000, 1, 'InternalOnly', 15, 15, 1, 0, 'Company', 'Business', {0}, {0}),
              ('0000000b-0000-0000-0000-000000000000', 'DeveloperPremium',  'developer_premium',   -1, -1, -1, 30, 30000, 260000, 1, 'InternalOnly', 16, 16, 1, 1, 'Company', 'Business', {0}, {0})",
            nowPlan);

        // ── Update missing plan metadata for 0a + 0b (idempotent) ────────────
        await db.Database.ExecuteSqlRawAsync(@"
            UPDATE Plans SET
                ImageLimitPerListing = 30,
                VideoAllowed         = 1,
                AnalyticsAccess      = 1,
                Description          = 'لشركات التطوير العقاري الناشئة — مشاريع متعددة وفرق عمل'
            WHERE Id = '0000000a-0000-0000-0000-000000000000';
            UPDATE Plans SET
                ImageLimitPerListing = -1,
                VideoAllowed         = 1,
                AnalyticsAccess      = 1,
                IsRecommended        = 1,
                Description          = 'لكبرى شركات التطوير العقاري — طاقة غير محدودة ودعم أولوية'
            WHERE Id = '0000000b-0000-0000-0000-000000000000'");

        // ── PlanFeatures for DeveloperBusiness (0a) + DeveloperPremium (0b) ───
        // Features: fd1=analytics  fd2=priority_support  fd3=featured_listings  fd4=project_management
        await db.Database.ExecuteSqlRawAsync(@"
            INSERT OR IGNORE INTO PlanFeatures (Id, SubscriptionPlanId, FeatureDefinitionId, IsEnabled, CreatedAt, UpdatedAt)
            VALUES
              ('ce000010-0000-0000-0000-000000000000', '0000000a-0000-0000-0000-000000000000', 'fd000001-0000-0000-0000-000000000000', 1, {0}, {0}),
              ('ce000011-0000-0000-0000-000000000000', '0000000a-0000-0000-0000-000000000000', 'fd000002-0000-0000-0000-000000000000', 0, {0}, {0}),
              ('ce000012-0000-0000-0000-000000000000', '0000000a-0000-0000-0000-000000000000', 'fd000003-0000-0000-0000-000000000000', 1, {0}, {0}),
              ('ce000013-0000-0000-0000-000000000000', '0000000a-0000-0000-0000-000000000000', 'fd000004-0000-0000-0000-000000000000', 1, {0}, {0}),
              ('ce000014-0000-0000-0000-000000000000', '0000000b-0000-0000-0000-000000000000', 'fd000001-0000-0000-0000-000000000000', 1, {0}, {0}),
              ('ce000015-0000-0000-0000-000000000000', '0000000b-0000-0000-0000-000000000000', 'fd000002-0000-0000-0000-000000000000', 1, {0}, {0}),
              ('ce000016-0000-0000-0000-000000000000', '0000000b-0000-0000-0000-000000000000', 'fd000003-0000-0000-0000-000000000000', 1, {0}, {0}),
              ('ce000017-0000-0000-0000-000000000000', '0000000b-0000-0000-0000-000000000000', 'fd000004-0000-0000-0000-000000000000', 1, {0}, {0})",
            nowPlan);

        // ── PlanLimits for DeveloperBusiness (0a) + DeveloperPremium (0b) ─────
        // Limits: add1=max_active_listings  add2=max_agents  add3=max_projects  add4=max_project_units
        await db.Database.ExecuteSqlRawAsync(@"
            INSERT OR IGNORE INTO PlanLimits (Id, SubscriptionPlanId, LimitDefinitionId, Value, CreatedAt, UpdatedAt)
            VALUES
              ('c1000010-0000-0000-0000-000000000000', '0000000a-0000-0000-0000-000000000000', 'add00001-0000-0000-0000-000000000000',  50, {0}, {0}),
              ('c1000011-0000-0000-0000-000000000000', '0000000a-0000-0000-0000-000000000000', 'add00002-0000-0000-0000-000000000000',  10, {0}, {0}),
              ('c1000012-0000-0000-0000-000000000000', '0000000a-0000-0000-0000-000000000000', 'add00003-0000-0000-0000-000000000000',   5, {0}, {0}),
              ('c1000013-0000-0000-0000-000000000000', '0000000a-0000-0000-0000-000000000000', 'add00004-0000-0000-0000-000000000000', 200, {0}, {0}),
              ('c1000014-0000-0000-0000-000000000000', '0000000b-0000-0000-0000-000000000000', 'add00001-0000-0000-0000-000000000000',  -1, {0}, {0}),
              ('c1000015-0000-0000-0000-000000000000', '0000000b-0000-0000-0000-000000000000', 'add00002-0000-0000-0000-000000000000',  -1, {0}, {0}),
              ('c1000016-0000-0000-0000-000000000000', '0000000b-0000-0000-0000-000000000000', 'add00003-0000-0000-0000-000000000000',  -1, {0}, {0}),
              ('c1000017-0000-0000-0000-000000000000', '0000000b-0000-0000-0000-000000000000', 'add00004-0000-0000-0000-000000000000',  -1, {0}, {0})",
            nowPlan);

        // ── PlanPricings for DeveloperBusiness (0a) + DeveloperPremium (0b) ───
        // IDs ef000012–ef000015 (next available after ef000011)
        await db.Database.ExecuteSqlRawAsync(@"
            INSERT OR IGNORE INTO PlanPricings (Id, PlanId, BillingCycle, PriceAmount, CurrencyCode, IsActive, IsPublic, ExternalProvider, ExternalPriceId, CreatedAt, UpdatedAt)
            VALUES
              ('ef000012-0000-0000-0000-000000000000', '0000000a-0000-0000-0000-000000000000', 'Monthly',  15000, 'SYP', 1, 1, NULL, NULL, {0}, {0}),
              ('ef000013-0000-0000-0000-000000000000', '0000000a-0000-0000-0000-000000000000', 'Yearly',  130000, 'SYP', 1, 1, NULL, NULL, {0}, {0}),
              ('ef000014-0000-0000-0000-000000000000', '0000000b-0000-0000-0000-000000000000', 'Monthly',  30000, 'SYP', 1, 1, NULL, NULL, {0}, {0}),
              ('ef000015-0000-0000-0000-000000000000', '0000000b-0000-0000-0000-000000000000', 'Yearly',  260000, 'SYP', 1, 1, NULL, NULL, {0}, {0})",
            nowPlan);

        // ── Seed project_management feature for existing business plans ─────────
        // OfficeStarter (08) and OfficeGrowth (09) also get project_management access.
        await db.Database.ExecuteSqlRawAsync(@"
            INSERT OR IGNORE INTO PlanFeatures (Id, SubscriptionPlanId, FeatureDefinitionId, IsEnabled, CreatedAt, UpdatedAt)
            VALUES
              ('ce000018-0000-0000-0000-000000000000', '00000008-0000-0000-0000-000000000000', 'fd000004-0000-0000-0000-000000000000', 1, {0}, {0}),
              ('ce000019-0000-0000-0000-000000000000', '00000009-0000-0000-0000-000000000000', 'fd000004-0000-0000-0000-000000000000', 1, {0}, {0})",
            nowPlan);

        // ── Seed max_project_units for existing business plans ────────────────
        // OfficeStarter(08): 100 units. OfficeGrowth(09): -1 (unlimited).
        await db.Database.ExecuteSqlRawAsync(@"
            INSERT OR IGNORE INTO PlanLimits (Id, SubscriptionPlanId, LimitDefinitionId, Value, CreatedAt, UpdatedAt)
            VALUES
              ('c1000018-0000-0000-0000-000000000000', '00000008-0000-0000-0000-000000000000', 'add00004-0000-0000-0000-000000000000', 100, {0}, {0}),
              ('c1000019-0000-0000-0000-000000000000', '00000009-0000-0000-0000-000000000000', 'add00004-0000-0000-0000-000000000000',  -1, {0}, {0})",
            nowPlan);

        // ══════════════════════════════════════════════════════════════════════════
        // END PHASE A v2
        // ══════════════════════════════════════════════════════════════════════════

        // Seed the personal listings sentinel company (fixed GUID)
        var personalCompanyId = "00000000-0000-0000-0000-000000000001";
        var now0 = DateTime.UtcNow.ToString("O");
        await db.Database.ExecuteSqlRawAsync(
            "INSERT OR IGNORE INTO Companies (Id, Name, IsVerified, IsDeleted, CreatedAt, UpdatedAt) VALUES ({0}, {1}, 0, 0, {2}, {3})",
            personalCompanyId, "إعلانات شخصية", now0, now0);

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

        // Create PropertyTypeConfigs table
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS PropertyTypeConfigs (
                Id TEXT NOT NULL PRIMARY KEY,
                Value TEXT NOT NULL,
                Label TEXT NOT NULL,
                Icon TEXT NOT NULL DEFAULT '',
                [Order] INTEGER NOT NULL DEFAULT 0,
                IsActive INTEGER NOT NULL DEFAULT 1,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NOT NULL
            )");
        try { await db.Database.ExecuteSqlRawAsync("CREATE UNIQUE INDEX IF NOT EXISTS IX_PropertyTypeConfigs_Value ON PropertyTypeConfigs(Value)"); }
        catch { /* already exists */ }

        var hasPropertyTypes = db.PropertyTypeConfigs.Any();
        if (!hasPropertyTypes)
        {
            var now3 = DateTime.UtcNow.ToString("O");
            var propTypes = new[]
            {
                (Guid.NewGuid(), "Apartment", "شقة",          "🏢", 1),
                (Guid.NewGuid(), "Villa",     "فيلا",          "🏡", 2),
                (Guid.NewGuid(), "Office",    "مكتب",          "🏬", 3),
                (Guid.NewGuid(), "Shop",      "محل تجاري",     "🏪", 4),
                (Guid.NewGuid(), "Land",      "أرض",           "🌍", 5),
                (Guid.NewGuid(), "Building",  "بناء كامل",     "🏗️", 6),
            };
            foreach (var (id, value, label, icon, order) in propTypes)
            {
                await db.Database.ExecuteSqlRawAsync(
                    "INSERT OR IGNORE INTO PropertyTypeConfigs (Id, Value, Label, Icon, [Order], IsActive, CreatedAt, UpdatedAt) VALUES ({0}, {1}, {2}, {3}, {4}, 1, {5}, {6})",
                    id.ToString(), value, label, icon, order, now3, now3);
            }
            logger.LogInformation("Seeded default property types");
        }

        // Create OwnershipTypeConfigs table
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS OwnershipTypeConfigs (
                Id TEXT NOT NULL PRIMARY KEY,
                Value TEXT NOT NULL,
                Label TEXT NOT NULL,
                [Order] INTEGER NOT NULL DEFAULT 0,
                IsActive INTEGER NOT NULL DEFAULT 1,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NOT NULL
            )");
        try { await db.Database.ExecuteSqlRawAsync("CREATE UNIQUE INDEX IF NOT EXISTS IX_OwnershipTypeConfigs_Value ON OwnershipTypeConfigs(Value)"); }
        catch { /* already exists */ }

        var hasOwnershipTypes = db.OwnershipTypeConfigs.Any();
        if (!hasOwnershipTypes)
        {
            var now4 = DateTime.UtcNow.ToString("O");
            var ownershipTypes = new[]
            {
                (Guid.NewGuid(), "GreenDeed",       "طابو أخضر",         1),
                (Guid.NewGuid(), "BlueDeed",        "طابو أزرق",         2),
                (Guid.NewGuid(), "CourtOrder",      "حكم محكمة",         3),
                (Guid.NewGuid(), "Customary",       "ملكية عرفية",       4),
                (Guid.NewGuid(), "LongTermLease",   "إيجار طويل الأمد",  5),
                (Guid.NewGuid(), "UnderSettlement", "قيد تسوية",         6),
            };
            foreach (var (id, value, label, order) in ownershipTypes)
            {
                await db.Database.ExecuteSqlRawAsync(
                    "INSERT OR IGNORE INTO OwnershipTypeConfigs (Id, Value, Label, [Order], IsActive, CreatedAt, UpdatedAt) VALUES ({0}, {1}, {2}, {3}, 1, {4}, {5})",
                    id.ToString(), value, label, order, now4, now4);
            }
            logger.LogInformation("Seeded default ownership types");
        }

        // Create LocationCities table (fresh install includes all columns)
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS LocationCities (
                Id TEXT NOT NULL PRIMARY KEY,
                Name TEXT NOT NULL,
                NormalizedName TEXT NOT NULL DEFAULT '',
                Province TEXT NOT NULL DEFAULT '',
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NOT NULL
            )");
        // Use normalized-name unique index (old Name-only index is dropped above in migrations)
        try
        {
            await db.Database.ExecuteSqlRawAsync(
                "CREATE UNIQUE INDEX IF NOT EXISTS IX_LocationCities_Province_NormalizedName ON LocationCities(Province, NormalizedName) WHERE NormalizedName != ''");
        }
        catch { /* already exists */ }

        // Seed Syrian cities if none exist
        var hasCities = db.LocationCities.Any();
        if (!hasCities)
        {
            var now2 = DateTime.UtcNow.ToString("O");
            // (city, province, normalizedName)
            var citySeeds = new (string Name, string Province, string Norm)[]
            {
                ("دمشق",       "دمشق",       "دمشق"),
                ("حلب",        "حلب",        "حلب"),
                ("حمص",        "حمص",        "حمص"),
                ("اللاذقية",   "اللاذقية",   "اللاذقية"),
                ("طرطوس",      "طرطوس",      "طرطوس"),
                ("حماة",       "حماة",       "حماه"),
                ("دير الزور",  "دير الزور",  "دير الزور"),
                ("الرقة",      "الرقة",      "الرقة"),
                ("السويداء",   "السويداء",   "السويداء"),
                ("درعا",       "درعا",       "درعا"),
                ("القامشلي",   "الحسكة",     "القامشلي"),
                ("إدلب",       "إدلب",       "ادلب"),
                ("الحسكة",     "الحسكة",     "الحسكة"),
            };
            foreach (var (name, province, norm) in citySeeds)
            {
                await db.Database.ExecuteSqlRawAsync(
                    "INSERT OR IGNORE INTO LocationCities (Id, Name, NormalizedName, Province, CreatedAt, UpdatedAt) VALUES ({0}, {1}, {2}, {3}, {4}, {5})",
                    Guid.NewGuid().ToString(), name, norm, province, now2, now2);
            }
            logger.LogInformation("Seeded Syrian cities with NormalizedName");
        }

        // Create LocationNeighborhoods table (fresh install includes all columns)
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS LocationNeighborhoods (
                Id TEXT NOT NULL PRIMARY KEY,
                Name TEXT NOT NULL,
                NormalizedName TEXT NOT NULL DEFAULT '',
                City TEXT NOT NULL,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NOT NULL
            )");
        // Use normalized-name unique index (old Name+City index is dropped above in migrations)
        try
        {
            await db.Database.ExecuteSqlRawAsync(
                "CREATE UNIQUE INDEX IF NOT EXISTS IX_LocationNeighborhoods_NormalizedName_City ON LocationNeighborhoods(NormalizedName, City) WHERE NormalizedName != ''");
        }
        catch { /* already exists */ }

        // Create BuyerRequests table
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS BuyerRequests (
                Id TEXT NOT NULL PRIMARY KEY,
                Title TEXT NOT NULL,
                PropertyType TEXT NOT NULL,
                Description TEXT NOT NULL,
                City TEXT,
                Neighborhood TEXT,
                IsPublished INTEGER NOT NULL DEFAULT 1,
                UserId TEXT NOT NULL,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NOT NULL,
                FOREIGN KEY (UserId) REFERENCES Users(Id)
            )");

        // Create BuyerRequestComments table
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS BuyerRequestComments (
                Id TEXT NOT NULL PRIMARY KEY,
                Content TEXT NOT NULL,
                BuyerRequestId TEXT NOT NULL,
                UserId TEXT NOT NULL,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NOT NULL,
                FOREIGN KEY (BuyerRequestId) REFERENCES BuyerRequests(Id) ON DELETE CASCADE,
                FOREIGN KEY (UserId) REFERENCES Users(Id)
            )");

        // ── Blog module ────────────────────────────────────────────────────────
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS BlogCategories (
                Id          TEXT NOT NULL PRIMARY KEY,
                Name        TEXT NOT NULL,
                Slug        TEXT NOT NULL,
                Description TEXT,
                IsActive    INTEGER NOT NULL DEFAULT 1,
                SortOrder   INTEGER NOT NULL DEFAULT 0,
                CreatedAt   TEXT NOT NULL,
                UpdatedAt   TEXT NOT NULL
            )");
        await db.Database.ExecuteSqlRawAsync(
            "CREATE UNIQUE INDEX IF NOT EXISTS IX_BlogCategories_Slug ON BlogCategories(Slug)");

        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS BlogPosts (
                Id                TEXT NOT NULL PRIMARY KEY,
                Title             TEXT NOT NULL,
                Slug              TEXT NOT NULL,
                Excerpt           TEXT,
                Content           TEXT NOT NULL DEFAULT '',
                CoverImageUrl     TEXT,
                CoverImageAlt     TEXT,
                Tags              TEXT,
                Status            TEXT NOT NULL DEFAULT 'Draft',
                PublishedAt       TEXT,
                IsFeatured        INTEGER NOT NULL DEFAULT 0,
                SeoTitle          TEXT,
                SeoDescription    TEXT,
                SeoTitleMode      TEXT NOT NULL DEFAULT 'Auto',
                SeoDescriptionMode TEXT NOT NULL DEFAULT 'Auto',
                SeoMode           TEXT NOT NULL DEFAULT 'Auto',
                SlugMode          TEXT NOT NULL DEFAULT 'Auto',
                OgTitle           TEXT,
                OgDescription     TEXT,
                ReadTimeMinutes   INTEGER,
                ViewCount         INTEGER NOT NULL DEFAULT 0,
                IsDeleted         INTEGER NOT NULL DEFAULT 0,
                CreatedByUserId   TEXT NOT NULL REFERENCES Users(Id),
                UpdatedByUserId   TEXT REFERENCES Users(Id),
                PublishedByUserId TEXT REFERENCES Users(Id),
                CreatedAt         TEXT NOT NULL,
                UpdatedAt         TEXT NOT NULL
            )");
        await db.Database.ExecuteSqlRawAsync(
            "CREATE UNIQUE INDEX IF NOT EXISTS IX_BlogPosts_Slug ON BlogPosts(Slug)");
        await db.Database.ExecuteSqlRawAsync(
            "CREATE INDEX IF NOT EXISTS IX_BlogPosts_Status ON BlogPosts(Status)");
        await db.Database.ExecuteSqlRawAsync(
            "CREATE INDEX IF NOT EXISTS IX_BlogPosts_PublishedAt ON BlogPosts(PublishedAt)");

        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS BlogPostCategories (
                BlogPostId     TEXT NOT NULL REFERENCES BlogPosts(Id) ON DELETE CASCADE,
                BlogCategoryId TEXT NOT NULL REFERENCES BlogCategories(Id),
                PRIMARY KEY (BlogPostId, BlogCategoryId)
            )");

        // ── Property Amenities catalog + junction table ───────────────────────
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS PropertyAmenities (
                Id        TEXT NOT NULL PRIMARY KEY,
                Key       TEXT NOT NULL,
                Label     TEXT NOT NULL,
                GroupAr   TEXT NOT NULL DEFAULT '',
                ""Order"" INTEGER NOT NULL DEFAULT 0,
                IsActive  INTEGER NOT NULL DEFAULT 1,
                CreatedAt TEXT NOT NULL DEFAULT (datetime('now')),
                UpdatedAt TEXT NOT NULL DEFAULT (datetime('now'))
            )");
        try { await db.Database.ExecuteSqlRawAsync("CREATE UNIQUE INDEX IF NOT EXISTS IX_PropertyAmenities_Key ON PropertyAmenities(Key)"); }
        catch { /* index already exists */ }

        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS PropertyAmenitySelections (
                PropertyId TEXT NOT NULL REFERENCES Properties(Id) ON DELETE CASCADE,
                AmenityId  TEXT NOT NULL REFERENCES PropertyAmenities(Id) ON DELETE CASCADE,
                PRIMARY KEY (PropertyId, AmenityId)
            )");
        try { await db.Database.ExecuteSqlRawAsync("CREATE INDEX IF NOT EXISTS IX_PropertyAmenitySelections_PropertyId ON PropertyAmenitySelections(PropertyId)"); }
        catch { /* index already exists */ }

        // ── Companies: add CompanyType column (RealEstateOffice | DeveloperCompany) ──
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Companies ADD COLUMN CompanyType TEXT NOT NULL DEFAULT 'DeveloperCompany'"); }
        catch { /* column already exists */ }

        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS Notifications (
                Id                TEXT NOT NULL PRIMARY KEY,
                UserId            TEXT NOT NULL REFERENCES Users(Id) ON DELETE CASCADE,
                Type              TEXT NOT NULL,
                Title             TEXT NOT NULL,
                Body              TEXT NOT NULL,
                IsRead            INTEGER NOT NULL DEFAULT 0,
                RelatedEntityId   TEXT,
                RelatedEntityType TEXT,
                CreatedAt         TEXT NOT NULL DEFAULT (datetime('now')),
                UpdatedAt         TEXT NOT NULL DEFAULT (datetime('now'))
            )");
        try { await db.Database.ExecuteSqlRawAsync("CREATE INDEX IF NOT EXISTS IX_Notifications_UserId ON Notifications(UserId)"); }
        catch { /* index already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("CREATE INDEX IF NOT EXISTS IX_Notifications_UserId_IsRead ON Notifications(UserId, IsRead)"); }
        catch { /* index already exists */ }

        await seeder.SeedAsync();

        // DIAGNOSTIC: verify OgDescription via raw ADO.NET (bypasses EF Core)
        try
        {
            using var rawConn = new Microsoft.Data.Sqlite.SqliteConnection("Data Source=/home/runner/workspace/boioot/apps/backend/boioot.db;Pooling=False");
            await rawConn.OpenAsync();

            // Check PRAGMA table_info
            using var pragma = rawConn.CreateCommand();
            pragma.CommandText = "PRAGMA table_info(BlogPosts)";
            var cols = new System.Text.StringBuilder();
            using (var r = await pragma.ExecuteReaderAsync())
                while (await r.ReadAsync()) cols.Append(r.GetString(1) + ",");
            logger.LogInformation("DIAG PRAGMA columns: {cols}", cols.ToString());

            // Direct SELECT
            using var selectCmd = rawConn.CreateCommand();
            selectCmd.CommandText = "SELECT OgDescription FROM BlogPosts LIMIT 0";
            try
            {
                await selectCmd.ExecuteNonQueryAsync();
                logger.LogInformation("DIAG RAW SELECT OgDescription: SUCCESS");
            }
            catch (Exception ex2)
            {
                logger.LogError("DIAG RAW SELECT OgDescription: FAILED — {msg}", ex2.Message);
            }
        }
        catch (Exception ex)
        {
            logger.LogError("DIAG raw connection failed: {msg}", ex.Message);
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "تعذّر تهيئة قاعدة البيانات أو تنفيذ بيانات البذر");
    }
}

app.Run();
