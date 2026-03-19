using Boioot.Domain.Entities;
using Boioot.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Persistence.Seeding;

public class DataSeeder
{
    private readonly BoiootDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<DataSeeder> _logger;

    public DataSeeder(
        BoiootDbContext context,
        IConfiguration configuration,
        ILogger<DataSeeder> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SeedAsync()
    {
        await SeedAdminUserAsync();
        await SeedSyrianCitiesAsync();
        await SeedRbacAsync();
        await SeedAdminUserRoleAsync();
        await SeedSamplePropertiesAsync();
    }

    // ── Admin user ────────────────────────────────────────────────────────────

    private async Task SeedAdminUserAsync()
    {
        var adminEmail = _configuration["AdminSeed:Email"];
        var adminPassword = _configuration["AdminSeed:Password"];
        var adminFullName = _configuration["AdminSeed:FullName"] ?? "مدير النظام";

        if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPassword))
        {
            _logger.LogDebug("AdminSeed config not found — skipping admin seed");
            return;
        }

        var emailLower = adminEmail.ToLowerInvariant();

        var adminExists = await _context.Users
            .IgnoreQueryFilters()
            .AnyAsync(u => u.Email == emailLower && u.Role == UserRole.Admin);

        if (adminExists)
        {
            _logger.LogDebug("Admin user already exists — skipping seed");
            return;
        }

        var admin = new User
        {
            FullName = adminFullName,
            Email = emailLower,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword),
            Role = UserRole.Admin,
            IsActive = true
        };

        _context.Users.Add(admin);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Admin user seeded: {Email}", emailLower);
    }

    // ── Admin UserRole assignment (DB-driven RBAC) ────────────────────────────

    private async Task SeedAdminUserRoleAsync()
    {
        var adminEmail = _configuration["AdminSeed:Email"];
        if (string.IsNullOrWhiteSpace(adminEmail)) return;

        var emailLower = adminEmail.ToLowerInvariant();

        await _context.Database.ExecuteSqlRawAsync(@"
            INSERT OR IGNORE INTO UserRoles (UserId, RoleId)
            SELECT u.Id, r.Id
            FROM   Users u, Roles r
            WHERE  u.Email = {0} AND r.Name = 'Admin'",
            emailLower);

        var permCount = await _context.RbacRoles
            .Where(r => r.Name == "Admin")
            .SelectMany(r => r.RolePermissions)
            .CountAsync();

        _logger.LogInformation(
            "[RBAC] Admin → DB ONLY ({PermCount} perms) — UserRole assigned for {Email}",
            permCount, emailLower);
    }

    // ── Syrian cities ─────────────────────────────────────────────────────────

    private async Task SeedSyrianCitiesAsync()
    {
        var defaults = new[]
        {
            ("دمشق",       "دمشق"),
            ("حلب",        "حلب"),
            ("حمص",        "حمص"),
            ("حماة",       "حماة"),
            ("اللاذقية",   "اللاذقية"),
            ("طرطوس",      "طرطوس"),
            ("دير الزور",  "دير الزور"),
            ("الرقة",      "الرقة"),
            ("درعا",       "درعا"),
            ("السويداء",   "السويداء"),
            ("القنيطرة",   "القنيطرة"),
            ("إدلب",       "إدلب"),
            ("الحسكة",     "الحسكة"),
            ("ريف دمشق",   "ريف دمشق"),
        };

        var existing = await _context.LocationCities
            .Select(c => c.Name)
            .ToListAsync();

        var existingSet = new HashSet<string>(existing);
        int added = 0;

        foreach (var (name, province) in defaults)
        {
            if (!existingSet.Contains(name))
            {
                _context.LocationCities.Add(new LocationCity { Name = name, Province = province });
                added++;
            }
        }

        if (added > 0)
        {
            await _context.SaveChangesAsync();
            _logger.LogInformation("Syrian cities seeded: {Count} new cities added", added);
        }
        else
        {
            _logger.LogDebug("All default Syrian cities already exist — skipping city seed");
        }
    }

    // ── Dynamic RBAC — Phase 1 seed ───────────────────────────────────────────
    //
    // Seeds:
    //   Roles      — Admin, CompanyOwner, Broker, Agent
    //   Permissions — all permission keys listed in the task spec
    //   RolePermissions — role → permission mapping per task spec
    //   UserRoles  — NOT seeded here; assigned when users register/change role
    //
    // Safe to call multiple times — uses INSERT OR IGNORE.
    // Does NOT touch the existing auth flow (User.Role enum / JWT generation).

    private async Task SeedRbacAsync()
    {
        // ── 1. Roles ──────────────────────────────────────────────────────────

        var roleNames = new[]
        {
            "Admin",
            "AdminManager",
            "CustomerSupport",
            "TechnicalSupport",
            "ContentEditor",
            "SeoSpecialist",
            "MarketingStaff",
            "CompanyOwner",
            "Broker",
            "Agent",
            "Owner",
            "User",
        };

        var now = DateTime.UtcNow.ToString("o"); // ISO 8601

        foreach (var name in roleNames)
        {
            await _context.Database.ExecuteSqlRawAsync(
                "INSERT OR IGNORE INTO Roles (Id, Name, CreatedAt, UpdatedAt) VALUES ({0}, {1}, {2}, {2})",
                Guid.NewGuid().ToString(), name, now);
        }

        // ── 2. Permissions ────────────────────────────────────────────────────

        var permissionKeys = new[]
        {
            // Properties
            "properties.view",
            "properties.create",
            "properties.edit",
            "properties.delete",
            // Projects
            "projects.view",
            "projects.create",
            "projects.edit",
            "projects.delete",
            // Agents
            "agents.view",
            "agents.manage",
            // Users
            "users.view",
            "users.edit",
            "users.disable",
            // Staff
            "staff.view",
            "staff.create",
            "staff.edit",
            "staff.disable",
            // Roles
            "roles.view",
            "roles.manage",
            // Companies
            "companies.view",
            "companies.edit",
            // Requests
            "requests.view",
            "requests.assign",
            "requests.edit",
            // Blog
            "blog.view",
            "blog.create",
            "blog.edit",
            "blog.publish",
            "blog.delete",
            "blog.seo.manage",
            // SEO
            "seo.settings.manage",
            // Marketing
            "marketing.view",
            "marketing.manage",
            // Settings
            "settings.view",
            "settings.manage",
            // Billing
            "billing.view",
            "billing.manage",
        };

        foreach (var key in permissionKeys)
        {
            await _context.Database.ExecuteSqlRawAsync(
                "INSERT OR IGNORE INTO Permissions (Id, Key, CreatedAt, UpdatedAt) VALUES ({0}, {1}, {2}, {2})",
                Guid.NewGuid().ToString(), key, now);
        }

        // ── 3. Role → Permission mapping ──────────────────────────────────────

        var mapping = new Dictionary<string, string[]>
        {
            ["Admin"] = permissionKeys, // All permissions

            ["AdminManager"] = new[]
            {
                "users.view", "users.edit", "users.disable",
                "staff.view", "staff.create", "staff.edit",
                "roles.view",
                "properties.view", "properties.edit",
                "projects.view", "projects.edit",
                "requests.view", "requests.assign", "requests.edit",
                "companies.view", "companies.edit",
                "blog.view", "blog.create", "blog.edit", "blog.publish",
                "blog.seo.manage", "seo.settings.manage",
                "settings.view", "settings.manage",
                "billing.view",
            },

            ["CustomerSupport"] = new[]
            {
                "users.view",
                "properties.view",
                "projects.view",
                "requests.view", "requests.assign", "requests.edit",
                "companies.view",
                "blog.view",
            },

            ["TechnicalSupport"] = new[]
            {
                "users.view", "users.edit",
                "properties.view", "properties.edit",
                "projects.view",
                "requests.view",
                "companies.view",
                "settings.view",
            },

            ["ContentEditor"] = new[]
            {
                "blog.view", "blog.create", "blog.edit",
            },

            ["SeoSpecialist"] = new[]
            {
                "blog.view", "blog.edit",
                "blog.seo.manage", "seo.settings.manage",
            },

            ["MarketingStaff"] = new[]
            {
                "marketing.view", "marketing.manage",
                "blog.view",
            },

            // Platform roles
            ["CompanyOwner"] = new[]
            {
                "properties.view", "properties.create", "properties.edit", "properties.delete",
                "projects.view", "projects.create", "projects.edit", "projects.delete",
                "agents.view", "agents.manage",
            },

            ["Broker"] = new[]
            {
                "properties.view", "properties.create",
                "agents.view", "agents.manage",
            },

            ["Agent"] = new[]
            {
                "agents.view",
                "properties.view",
            },
        };

        foreach (var (roleName, perms) in mapping)
        {
            foreach (var permKey in perms)
            {
                await _context.Database.ExecuteSqlRawAsync(@"
                    INSERT OR IGNORE INTO RolePermissions (RoleId, PermissionId)
                    SELECT r.Id, p.Id
                    FROM   Roles r, Permissions p
                    WHERE  r.Name = {0} AND p.Key = {1}",
                    roleName, permKey);
            }
        }

        _logger.LogInformation("Dynamic RBAC seed complete: {RoleCount} roles, {PermCount} permissions",
            roleNames.Length, permissionKeys.Length);
    }

    // ── Sample properties ─────────────────────────────────────────────────────
    private async Task SeedSamplePropertiesAsync()
    {
        var hasProperties = await _context.Set<Boioot.Domain.Entities.Property>()
            .IgnoreQueryFilters().AnyAsync();
        if (hasProperties) return;

        var now = DateTime.UtcNow.ToString("o");
        var companyId = "00000000-0000-0000-0000-000000000001";

        var properties = new[]
        {
            new
            {
                Id = "11111111-0000-0000-0000-000000000001",
                Title = "شقة فاخرة في المزة",
                Description = "شقة واسعة بإطلالة رائعة في حي المزة الراقي، تتميز بتشطيبات عالية الجودة وموقع متميز قريب من جميع الخدمات.",
                Type = "Apartment",
                ListingType = "Sale",
                Price = 85000000m,
                Area = 175m,
                Bedrooms = 3,
                Bathrooms = 2,
                Province = "دمشق",
                City = "دمشق",
                Neighborhood = "المزة"
            },
            new
            {
                Id = "11111111-0000-0000-0000-000000000002",
                Title = "فيلا مميزة في يلدا",
                Description = "فيلا مستقلة ذات طابقين مع حديقة خاصة ومسبح، مناسبة للعائلات الكبيرة.",
                Type = "Villa",
                ListingType = "Sale",
                Price = 350000000m,
                Area = 400m,
                Bedrooms = 5,
                Bathrooms = 4,
                Province = "ريف دمشق",
                City = "دمشق",
                Neighborhood = "يلدا"
            },
            new
            {
                Id = "11111111-0000-0000-0000-000000000003",
                Title = "مكتب تجاري في وسط المدينة",
                Description = "مكتب مجهز بالكامل في موقع تجاري مركزي، مناسب للشركات والمكاتب الاحترافية.",
                Type = "Office",
                ListingType = "Rent",
                Price = 500000m,
                Area = 80m,
                Bedrooms = 0,
                Bathrooms = 1,
                Province = "دمشق",
                City = "دمشق",
                Neighborhood = "البرامكة"
            },
            new
            {
                Id = "11111111-0000-0000-0000-000000000004",
                Title = "أرض سكنية في جرمانا",
                Description = "أرض سكنية مستوية في منطقة جرمانا، جاهزة للبناء الفوري مع كامل الوثائق.",
                Type = "Land",
                ListingType = "Sale",
                Price = 120000000m,
                Area = 500m,
                Bedrooms = 0,
                Bathrooms = 0,
                Province = "ريف دمشق",
                City = "جرمانا",
                Neighborhood = "جرمانا"
            },
            new
            {
                Id = "11111111-0000-0000-0000-000000000005",
                Title = "شقة للإيجار في كفرسوسة",
                Description = "شقة مفروشة بالكامل في كفرسوسة، مناسبة للعائلات والأفراد.",
                Type = "Apartment",
                ListingType = "Rent",
                Price = 800000m,
                Area = 120m,
                Bedrooms = 2,
                Bathrooms = 1,
                Province = "دمشق",
                City = "دمشق",
                Neighborhood = "كفرسوسة"
            },
        };

        foreach (var p in properties)
        {
            await _context.Database.ExecuteSqlRawAsync(@"
                INSERT OR IGNORE INTO Properties
                    (Id, Title, Description, Type, ListingType, Status, Price, Currency,
                     Area, Bedrooms, Bathrooms, Province, City, Neighborhood,
                     IsDeleted, PaymentType, HasCommission, ViewCount, CompanyId, CreatedAt, UpdatedAt)
                VALUES
                    ({0},{1},{2},{3},{4},'Available',{5},'SYP',
                     {6},{7},{8},{9},{10},{11},
                     0,'OneTime',0,0,{12},{13},{13})",
                p.Id, p.Title, p.Description, p.Type, p.ListingType, p.Price,
                p.Area, p.Bedrooms, p.Bathrooms, p.Province, p.City, p.Neighborhood,
                companyId, now);
        }

        _logger.LogInformation("Sample properties seeded");
    }
}
