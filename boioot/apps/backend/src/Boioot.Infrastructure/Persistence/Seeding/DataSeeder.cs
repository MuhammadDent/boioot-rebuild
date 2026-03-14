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
}
