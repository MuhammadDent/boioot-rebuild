using Boioot.Domain.Entities;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Features.Locations;
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
        _context       = context;
        _configuration = configuration;
        _logger        = logger;
    }

    public async Task SeedAsync()
    {
        await SeedAdminUserAsync();
        await SeedSyrianCitiesAsync();
        await SeedRbacAsync();
        await SeedAdminUserRoleAsync();
        await SeedSamplePropertiesAsync();
        await SeedPropertyAmenitiesAsync();
        await SeedOfficeTestUserAsync();
    }

    private async Task SeedPropertyAmenitiesAsync()
    {
        if (await _context.PropertyAmenities.AnyAsync()) return;

        var amenities = new List<PropertyAmenity>
        {
            new() { Key = "Balcony",         Label = "شرفة",           GroupAr = "داخلية", Order = 1  },
            new() { Key = "Elevator",        Label = "مصعد",           GroupAr = "داخلية", Order = 2  },
            new() { Key = "CentralAC",       Label = "تكييف مركزي",    GroupAr = "داخلية", Order = 3  },
            new() { Key = "Furnished",       Label = "مفروش",          GroupAr = "داخلية", Order = 4  },
            new() { Key = "SmartHome",       Label = "منزل ذكي",       GroupAr = "داخلية", Order = 5  },
            new() { Key = "MaidRoom",        Label = "غرفة خادمة",     GroupAr = "داخلية", Order = 6  },
            new() { Key = "DriverRoom",      Label = "غرفة سائق",      GroupAr = "داخلية", Order = 7  },
            new() { Key = "Storage",         Label = "غرفة تخزين",     GroupAr = "داخلية", Order = 8  },
            new() { Key = "CornerUnit",      Label = "شقة كونر",       GroupAr = "داخلية", Order = 9  },
            new() { Key = "PrivateEntrance", Label = "مدخل خاص",       GroupAr = "داخلية", Order = 10 },
            new() { Key = "Basement",        Label = "قبو",            GroupAr = "داخلية", Order = 11 },
            new() { Key = "Roof",            Label = "روف / سطح",      GroupAr = "داخلية", Order = 12 },
            new() { Key = "Duplex",          Label = "دوبلكس",         GroupAr = "داخلية", Order = 13 },
            new() { Key = "Parking",         Label = "موقف سيارة",     GroupAr = "خارجية", Order = 1  },
            new() { Key = "Security",        Label = "حراسة أمنية",    GroupAr = "خارجية", Order = 2  },
            new() { Key = "Garden",          Label = "حديقة",          GroupAr = "خارجية", Order = 3  },
            new() { Key = "Pool",            Label = "مسبح",           GroupAr = "خارجية", Order = 4  },
            new() { Key = "Gym",             Label = "صالة رياضية",    GroupAr = "خارجية", Order = 5  },
            new() { Key = "SeaView",         Label = "إطلالة بحرية",   GroupAr = "موقع",   Order = 1  },
            new() { Key = "NearMosque",      Label = "قرب مسجد",       GroupAr = "موقع",   Order = 2  },
            new() { Key = "NearSchool",      Label = "قرب مدرسة",      GroupAr = "موقع",   Order = 3  },
        };

        _context.PropertyAmenities.AddRange(amenities);
        await _context.SaveChangesAsync();
        _logger.LogInformation("Seeded {Count} property amenities", amenities.Count);
    }

    // ── Admin user ────────────────────────────────────────────────────────────

    private async Task SeedAdminUserAsync()
    {
        var adminEmail    = _configuration["AdminSeed:Email"];
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
            FullName     = adminFullName,
            Email        = emailLower,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword),
            Role         = UserRole.Admin,
            IsActive     = true
        };

        _context.Users.Add(admin);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Admin user seeded: {Email}", emailLower);
    }

    // ── Office test user seed ─────────────────────────────────────────────────

    private async Task SeedOfficeTestUserAsync()
    {
        const string officeEmail = "office@boioot.sy";

        var exists = await _context.Users
            .IgnoreQueryFilters()
            .AnyAsync(u => u.Email == officeEmail);

        if (exists)
        {
            _logger.LogDebug("[Seed] Office test user already exists — skipping.");
            return;
        }

        var officeUser = new User
        {
            FullName     = "مكتب العقارات الوطنية",
            Email        = officeEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123456"),
            Role         = UserRole.Office,
            UserCode     = "OFF-0001",
            IsActive     = true,
            Phone        = "+963911000001",
        };

        _context.Users.Add(officeUser);
        await _context.SaveChangesAsync();
        _logger.LogInformation("[Seed] Office test user seeded: {Email}", officeEmail);
    }

    // ── Admin UserRole assignment (DB-driven RBAC) ────────────────────────────

    private async Task SeedAdminUserRoleAsync()
    {
        var adminEmail = _configuration["AdminSeed:Email"];
        if (string.IsNullOrWhiteSpace(adminEmail)) return;

        var emailLower = adminEmail.ToLowerInvariant();

        var admin = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == emailLower && u.Role == UserRole.Admin);

        if (admin is null) return;

        var adminRole = await _context.RbacRoles
            .FirstOrDefaultAsync(r => r.Name == "Admin");

        if (adminRole is null) return;

        var alreadyAssigned = await _context.RbacUserRoles
            .AnyAsync(ur => ur.UserId == admin.Id && ur.RoleId == adminRole.Id);

        if (!alreadyAssigned)
        {
            _context.RbacUserRoles.Add(new RbacUserRole
            {
                UserId = admin.Id,
                RoleId = adminRole.Id,
            });
            await _context.SaveChangesAsync();
        }

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

        var existing    = await _context.LocationCities.Select(c => c.Name).ToListAsync();
        var existingSet = new HashSet<string>(existing);
        int added       = 0;

        foreach (var (name, province) in defaults)
        {
            if (!existingSet.Contains(name))
            {
                _context.LocationCities.Add(new LocationCity
                {
                    Name           = name,
                    NormalizedName = ArabicNormalizer.Normalize(name),
                    Province       = province,
                });
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

    private async Task SeedRbacAsync()
    {
        await SeedRbacRolesAsync();
        await SeedRbacPermissionsAsync();
        await SeedRbacRolePermissionsAsync();
    }

    private static readonly string[] RoleNames =
    [
        "Admin", "AdminManager", "CustomerSupport", "TechnicalSupport",
        "ContentEditor", "SeoSpecialist", "MarketingStaff",
        "CompanyOwner", "Office", "Broker", "Agent", "Owner", "User",
    ];

    private static readonly string[] PermissionKeys =
    [
        "properties.view", "properties.create", "properties.edit", "properties.delete",
        "projects.view",   "projects.create",   "projects.edit",   "projects.delete",
        "agents.view",     "agents.manage",
        "users.view",      "users.edit",         "users.disable",
        "staff.view",      "staff.create",        "staff.edit",      "staff.disable",
        "roles.view",      "roles.manage",
        "companies.view",  "companies.edit",
        "requests.view",   "requests.create",     "requests.assign", "requests.edit",
        "dashboard.view",
        "blog.view",       "blog.create",         "blog.edit",       "blog.publish",
        "blog.delete",     "blog.seo.manage",
        "seo.settings.manage",
        "marketing.view",  "marketing.manage",
        "settings.view",   "settings.manage",
        "billing.view",    "billing.manage",
    ];

    private static readonly Dictionary<string, string[]> RolePermissionMapping = new()
    {
        ["Admin"] = PermissionKeys,

        ["AdminManager"] =
        [
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
        ],

        ["CustomerSupport"] =
        [
            "users.view", "properties.view", "projects.view",
            "requests.view", "requests.assign", "requests.edit",
            "companies.view", "blog.view",
        ],

        ["TechnicalSupport"] =
        [
            "users.view", "users.edit",
            "properties.view", "properties.edit",
            "projects.view", "requests.view",
            "companies.view", "settings.view",
        ],

        ["ContentEditor"] = [ "blog.view", "blog.create", "blog.edit" ],

        ["SeoSpecialist"] = [ "blog.view", "blog.edit", "blog.seo.manage", "seo.settings.manage" ],

        ["MarketingStaff"] = [ "marketing.view", "marketing.manage", "blog.view" ],

        ["CompanyOwner"] =
        [
            "properties.view", "properties.create", "properties.edit", "properties.delete",
            "projects.view", "projects.create", "projects.edit", "projects.delete",
            "agents.view", "agents.manage",
            "requests.view", "requests.create",
            "dashboard.view",
        ],

        ["Office"] =
        [
            "properties.view", "properties.create", "properties.edit", "properties.delete",
            "agents.view", "agents.manage",
            "requests.view", "requests.create",
            "dashboard.view",
        ],

        ["Owner"]  = [ "properties.view", "properties.create" ],
        ["Broker"] = [ "properties.view", "properties.create" ],
        ["Agent"]  = [ "agents.view", "properties.view" ],
    };

    private async Task SeedRbacRolesAsync()
    {
        var existingRoleNames = (await _context.RbacRoles
            .Select(r => r.Name)
            .ToListAsync()).ToHashSet();

        var newRoles = RoleNames
            .Where(name => !existingRoleNames.Contains(name))
            .Select(name => new RbacRole { Name = name })
            .ToList();

        if (newRoles.Count > 0)
        {
            _context.RbacRoles.AddRange(newRoles);
            await _context.SaveChangesAsync();
            _logger.LogInformation("[RBAC] Seeded {Count} new roles.", newRoles.Count);
        }
    }

    private async Task SeedRbacPermissionsAsync()
    {
        var existingKeys = (await _context.RbacPermissions
            .Select(p => p.Key)
            .ToListAsync()).ToHashSet();

        var newPerms = PermissionKeys
            .Where(key => !existingKeys.Contains(key))
            .Select(key => new RbacPermission { Key = key })
            .ToList();

        if (newPerms.Count > 0)
        {
            _context.RbacPermissions.AddRange(newPerms);
            await _context.SaveChangesAsync();
            _logger.LogInformation("[RBAC] Seeded {Count} new permissions.", newPerms.Count);
        }
    }

    private async Task SeedRbacRolePermissionsAsync()
    {
        var roles = await _context.RbacRoles
            .ToDictionaryAsync(r => r.Name, r => r.Id);

        var permissions = await _context.RbacPermissions
            .ToDictionaryAsync(p => p.Key, p => p.Id);

        var existingList = await _context.RbacRolePermissions
            .Select(rp => new { rp.RoleId, rp.PermissionId })
            .ToListAsync();

        var existingSet = existingList
            .Select(rp => (rp.RoleId, rp.PermissionId))
            .ToHashSet();

        var toAdd = new List<RbacRolePermission>();

        foreach (var (roleName, permKeys) in RolePermissionMapping)
        {
            if (!roles.TryGetValue(roleName, out var roleId)) continue;

            foreach (var permKey in permKeys)
            {
                if (!permissions.TryGetValue(permKey, out var permId)) continue;
                if (existingSet.Contains((roleId, permId))) continue;

                toAdd.Add(new RbacRolePermission
                {
                    RoleId       = roleId,
                    PermissionId = permId,
                });
            }
        }

        if (toAdd.Count > 0)
        {
            _context.RbacRolePermissions.AddRange(toAdd);
            await _context.SaveChangesAsync();
            _logger.LogInformation("[RBAC] Seeded {Count} new role-permission mappings.", toAdd.Count);
        }

        _logger.LogInformation("Dynamic RBAC seed complete: {RoleCount} roles, {PermCount} permissions",
            RoleNames.Length, PermissionKeys.Length);
    }

    // ── Sample properties ─────────────────────────────────────────────────────

    private async Task SeedSamplePropertiesAsync()
    {
        var hasProperties = await _context.Set<Property>()
            .IgnoreQueryFilters()
            .AnyAsync();
        if (hasProperties) return;

        var companyId = Guid.Parse("00000000-0000-0000-0000-000000000001");

        var properties = new[]
        {
            new Property
            {
                Id          = Guid.Parse("11111111-0000-0000-0000-000000000001"),
                Title       = "شقة فاخرة في المزة",
                Description = "شقة واسعة بإطلالة رائعة في حي المزة الراقي، تتميز بتشطيبات عالية الجودة وموقع متميز قريب من جميع الخدمات.",
                Type        = PropertyType.Apartment,
                ListingType = "Sale",
                Status      = PropertyStatus.Available,
                Price       = 85_000_000m,
                Currency    = "SYP",
                Area        = 175m,
                Bedrooms    = 3,
                Bathrooms   = 2,
                Province    = "دمشق",
                City        = "دمشق",
                Neighborhood= "المزة",
                CompanyId   = companyId,
                PaymentType = "OneTime",
            },
            new Property
            {
                Id          = Guid.Parse("11111111-0000-0000-0000-000000000002"),
                Title       = "فيلا مميزة في يلدا",
                Description = "فيلا مستقلة ذات طابقين مع حديقة خاصة ومسبح، مناسبة للعائلات الكبيرة.",
                Type        = PropertyType.Villa,
                ListingType = "Sale",
                Status      = PropertyStatus.Available,
                Price       = 350_000_000m,
                Currency    = "SYP",
                Area        = 400m,
                Bedrooms    = 5,
                Bathrooms   = 4,
                Province    = "ريف دمشق",
                City        = "دمشق",
                Neighborhood= "يلدا",
                CompanyId   = companyId,
                PaymentType = "OneTime",
            },
            new Property
            {
                Id          = Guid.Parse("11111111-0000-0000-0000-000000000003"),
                Title       = "مكتب تجاري في وسط المدينة",
                Description = "مكتب مجهز بالكامل في موقع تجاري مركزي، مناسب للشركات والمكاتب الاحترافية.",
                Type        = PropertyType.Office,
                ListingType = "Rent",
                Status      = PropertyStatus.Available,
                Price       = 500_000m,
                Currency    = "SYP",
                Area        = 80m,
                Bedrooms    = 0,
                Bathrooms   = 1,
                Province    = "دمشق",
                City        = "دمشق",
                Neighborhood= "البرامكة",
                CompanyId   = companyId,
                PaymentType = "OneTime",
            },
            new Property
            {
                Id          = Guid.Parse("11111111-0000-0000-0000-000000000004"),
                Title       = "أرض سكنية في جرمانا",
                Description = "أرض سكنية مستوية في منطقة جرمانا، جاهزة للبناء الفوري مع كامل الوثائق.",
                Type        = PropertyType.Land,
                ListingType = "Sale",
                Status      = PropertyStatus.Available,
                Price       = 120_000_000m,
                Currency    = "SYP",
                Area        = 500m,
                Bedrooms    = 0,
                Bathrooms   = 0,
                Province    = "ريف دمشق",
                City        = "جرمانا",
                Neighborhood= "جرمانا",
                CompanyId   = companyId,
                PaymentType = "OneTime",
            },
            new Property
            {
                Id          = Guid.Parse("11111111-0000-0000-0000-000000000005"),
                Title       = "شقة للإيجار في كفرسوسة",
                Description = "شقة مفروشة بالكامل في كفرسوسة، مناسبة للعائلات والأفراد.",
                Type        = PropertyType.Apartment,
                ListingType = "Rent",
                Status      = PropertyStatus.Available,
                Price       = 800_000m,
                Currency    = "SYP",
                Area        = 120m,
                Bedrooms    = 2,
                Bathrooms   = 1,
                Province    = "دمشق",
                City        = "دمشق",
                Neighborhood= "كفرسوسة",
                CompanyId   = companyId,
                PaymentType = "OneTime",
            },
        };

        _context.Properties.AddRange(properties);
        await _context.SaveChangesAsync();
        _logger.LogInformation("Sample properties seeded.");
    }
}
