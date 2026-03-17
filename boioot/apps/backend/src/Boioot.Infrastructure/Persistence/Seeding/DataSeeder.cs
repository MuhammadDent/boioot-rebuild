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
    }

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
}
