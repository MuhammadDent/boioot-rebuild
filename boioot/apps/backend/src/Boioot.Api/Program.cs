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

    options.AddPolicy("BrokerOrCompanyOwner", policy =>
        policy.RequireRole(RoleNames.Broker, RoleNames.CompanyOwner, RoleNames.Admin));

    options.AddPolicy("CanListProperty", policy =>
        policy.RequireRole(RoleNames.Admin, RoleNames.CompanyOwner, RoleNames.Broker, RoleNames.Agent, RoleNames.Owner, RoleNames.User));
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
app.UseStaticFiles();
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

        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Messages ADD COLUMN AttachmentData TEXT"); }
        catch { /* column already exists */ }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Messages ADD COLUMN AttachmentName TEXT"); }
        catch { /* column already exists */ }

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

        // Property.AccountId — future ownership source (replaces CompanyId in Phase C)
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Properties ADD COLUMN AccountId TEXT"); }
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

        // Seed default Plans (ListingLimit: -1 = unlimited)
        var nowPlan = DateTime.UtcNow.ToString("O");
        await db.Database.ExecuteSqlRawAsync(@"
            INSERT OR IGNORE INTO Plans (Id, Name, ListingLimit, ProjectLimit, AgentLimit, FeaturedSlots, PriceMonthly, PriceYearly, IsActive, CreatedAt, UpdatedAt)
            VALUES
              ('00000001-0000-0000-0000-000000000000', 'Free',       2,  0,  0,  0,    0,    0, 1, {0}, {0}),
              ('00000002-0000-0000-0000-000000000000', 'Silver',     5,  0,  3,  1, 1500, 1200, 1, {0}, {0}),
              ('00000003-0000-0000-0000-000000000000', 'Gold',      20,  2, 10,  5, 3500, 2800, 1, {0}, {0}),
              ('00000004-0000-0000-0000-000000000000', 'Platinum',  -1, -1, -1, 20, 7000, 5600, 1, {0}, {0})",
            nowPlan);

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

        await seeder.SeedAsync();
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "تعذّر تهيئة قاعدة البيانات أو تنفيذ بيانات البذر");
    }
}

app.Run();
