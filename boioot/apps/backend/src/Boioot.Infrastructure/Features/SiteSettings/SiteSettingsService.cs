using Boioot.Application.Features.SiteSettings.DTOs;
using Boioot.Application.Features.SiteSettings.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Infrastructure.Features.SiteSettings;

public sealed class SiteSettingsService : ISiteSettingsService
{
    private readonly BoiootDbContext _ctx;

    // The four feature-toggle keys managed by this service.
    // All default to "true" so nothing disappears if the row is missing.
    private static readonly Dictionary<string, string> DefaultValues = new()
    {
        ["section_projects_enabled"]    = "true",
        ["section_requests_enabled"]    = "true",
        ["section_daily_rent_enabled"]  = "true",
        ["section_blog_enabled"]        = "true",
    };

    public SiteSettingsService(BoiootDbContext ctx) => _ctx = ctx;

    // ── Read ──────────────────────────────────────────────────────────────────

    public async Task<SiteSettingsDto> GetAsync(CancellationToken ct = default)
    {
        var rows = await _ctx.AppSettings
            .Where(s => DefaultValues.Keys.Contains(s.Key))
            .ToListAsync(ct);

        // Seed any missing keys so future reads are consistent
        await SeedMissingAsync(rows, ct);

        return MapToDto(rows);
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    public async Task UpdateAsync(SiteSettingsDto dto, CancellationToken ct = default)
    {
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
            {
                _ctx.AppSettings.Add(new AppSetting { Key = key, Value = value });
            }
            else
            {
                row.Value = value;
                _ctx.AppSettings.Update(row);
            }
        }

        await _ctx.SaveChangesAsync(ct);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

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

        await _ctx.SaveChangesAsync(ct);
    }

    private static SiteSettingsDto MapToDto(List<AppSetting> rows)
    {
        bool Get(string key)
        {
            var row = rows.FirstOrDefault(r => r.Key == key);
            return row is null || !bool.TryParse(row.Value, out var v) || v;
        }

        return new SiteSettingsDto(
            SectionProjectsEnabled:   Get("section_projects_enabled"),
            SectionRequestsEnabled:   Get("section_requests_enabled"),
            SectionDailyRentEnabled:  Get("section_daily_rent_enabled"),
            SectionBlogEnabled:       Get("section_blog_enabled"));
    }
}
