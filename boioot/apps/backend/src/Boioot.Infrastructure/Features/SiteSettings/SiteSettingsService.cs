using Boioot.Application.Features.SiteSettings.DTOs;
using Boioot.Application.Features.SiteSettings.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.SiteSettings;

public sealed class SiteSettingsService : ISiteSettingsService
{
    private readonly BoiootDbContext _ctx;
    private readonly ILogger<SiteSettingsService> _logger;

    private static readonly Dictionary<string, string> DefaultValues = new()
    {
        ["section_projects_enabled"]   = "true",
        ["section_requests_enabled"]   = "true",
        ["section_daily_rent_enabled"] = "true",
        ["section_blog_enabled"]       = "true",
    };

    public SiteSettingsService(BoiootDbContext ctx, ILogger<SiteSettingsService> logger)
    {
        _ctx    = ctx;
        _logger = logger;
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    public async Task<SiteSettingsDto> GetAsync(CancellationToken ct = default)
    {
        await EnsureTableAsync(ct);

        var rows = await _ctx.AppSettings
            .Where(s => DefaultValues.Keys.Contains(s.Key))
            .ToListAsync(ct);

        await SeedMissingAsync(rows, ct);

        return MapToDto(rows);
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    public async Task UpdateAsync(SiteSettingsDto dto, CancellationToken ct = default)
    {
        await EnsureTableAsync(ct);

        var updates = new Dictionary<string, string>
        {
            ["section_projects_enabled"]   = dto.SectionProjectsEnabled   ? "true" : "false",
            ["section_requests_enabled"]   = dto.SectionRequestsEnabled   ? "true" : "false",
            ["section_daily_rent_enabled"] = dto.SectionDailyRentEnabled  ? "true" : "false",
            ["section_blog_enabled"]       = dto.SectionBlogEnabled        ? "true" : "false",
        };

        var existing = await _ctx.AppSettings
            .Where(s => updates.Keys.Contains(s.Key))
            .ToListAsync(ct);

        foreach (var (key, value) in updates)
        {
            var row = existing.FirstOrDefault(r => r.Key == key);
            if (row is null)
                _ctx.AppSettings.Add(new AppSetting { Key = key, Value = value });
            else
            {
                row.Value = value;
                _ctx.AppSettings.Update(row);
            }
        }

        await _ctx.SaveChangesAsync(ct);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Creates the AppSettings table if it does not yet exist (idempotent).
    /// Handles environments where the EF migration has not been applied.
    /// Schema: only Key + Value — no Description column.
    /// </summary>
    private async Task EnsureTableAsync(CancellationToken ct)
    {
        await _ctx.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""AppSettings"" (
                ""Key""   VARCHAR(200) NOT NULL,
                ""Value"" TEXT         NOT NULL DEFAULT 'true',
                CONSTRAINT ""PK_AppSettings"" PRIMARY KEY (""Key"")
            );", ct);
    }

    private async Task SeedMissingAsync(List<AppSetting> existing, CancellationToken ct)
    {
        var presentKeys = existing.Select(r => r.Key).ToHashSet();
        var missing     = DefaultValues.Where(kv => !presentKeys.Contains(kv.Key)).ToList();

        if (missing.Count == 0) return;

        foreach (var (key, value) in missing)
        {
            var row = new AppSetting { Key = key, Value = value };
            _ctx.AppSettings.Add(row);
            existing.Add(row);
        }

        try
        {
            await _ctx.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[SiteSettings] SeedMissingAsync: could not persist defaults — using in-memory values");
            _ctx.ChangeTracker.Clear();
        }
    }

    private static SiteSettingsDto MapToDto(List<AppSetting> rows)
    {
        bool Get(string key)
        {
            var row = rows.FirstOrDefault(r => r.Key == key);
            return row is null || !bool.TryParse(row.Value, out var v) || v;
        }

        return new SiteSettingsDto(
            SectionProjectsEnabled:  Get("section_projects_enabled"),
            SectionRequestsEnabled:  Get("section_requests_enabled"),
            SectionDailyRentEnabled: Get("section_daily_rent_enabled"),
            SectionBlogEnabled:      Get("section_blog_enabled"));
    }
}
