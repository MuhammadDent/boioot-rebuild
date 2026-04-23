using System.Text.Json;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.Integrations;

// ── DTOs ─────────────────────────────────────────────────────────────────────

public record IntegrationFieldSchema(
    string Key,
    string Label,
    string? Placeholder,
    bool Required,
    string? Pattern,
    string? Hint);

public record IntegrationDef(
    string Key,
    string Name,
    string Description,
    string Icon,
    string Category,
    string CategoryLabel,
    List<IntegrationFieldSchema> ConfigSchema,
    int SortOrder);

public class IntegrationResponse
{
    public string Key { get; init; } = "";
    public string Name { get; init; } = "";
    public string Description { get; init; } = "";
    public string Icon { get; init; } = "";
    public string Category { get; init; } = "";
    public string CategoryLabel { get; init; } = "";
    public List<IntegrationFieldSchema> ConfigSchema { get; init; } = [];
    public int SortOrder { get; init; }

    public bool IsEnabled { get; set; }
    public Dictionary<string, string>? Config { get; set; }
    public string Status { get; set; } = "inactive";
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
}

public class SaveIntegrationRequest
{
    public Dictionary<string, string>? Config { get; set; }
}

public class ActiveIntegrationResponse
{
    public string Key { get; init; } = "";
    public Dictionary<string, string> Config { get; init; } = [];
}

// ── Exceptions ────────────────────────────────────────────────────────────────

public class IntegrationNotFoundException(string key)
    : Exception($"Integration '{key}' not found");

public class IntegrationValidationException(string message)
    : Exception(message);

// ── Service ───────────────────────────────────────────────────────────────────

public class IntegrationService
{
    private readonly BoiootDbContext _db;
    private readonly ILogger<IntegrationService> _log;

    private static readonly List<IntegrationDef> _catalog =
    [
        new("google-analytics", "Google Analytics",
            "قِس حركة مرور موقعك وسلوك الزوار بشكل تفصيلي",
            "📊", "analytics", "تحليلات",
            [new("measurementId", "Measurement ID", "G-XXXXXXXXXX", true, "^G-", "يبدأ بـ G-")],
            1),

        new("google-tag-manager", "Google Tag Manager",
            "أدِر جميع وسوم تتبعك من مكان واحد دون الحاجة إلى المطوّر",
            "🏷️", "analytics", "تحليلات",
            [new("containerId", "Container ID", "GTM-XXXXXXX", true, "^GTM-", "يبدأ بـ GTM-")],
            2),

        new("meta-pixel", "Meta Pixel",
            "تتبع تحويلات إعلانات فيسبوك وإنستغرام وأنشئ جمهوراً مخصصاً",
            "📘", "marketing", "التسويق",
            [new("pixelId", "Pixel ID", "123456789012345", true, "^[0-9]+$", "أرقام فقط")],
            3),

        new("tiktok-pixel", "TikTok Pixel",
            "تتبع أداء إعلاناتك على تيك توك وقِس معدلات التحويل",
            "🎵", "marketing", "التسويق",
            [new("pixelId", "Pixel ID", "XXXXXXXXXXXXXXXXXX", true, "^[A-Z0-9]+$", "حروف كبيرة وأرقام فقط")],
            4),

        new("snapchat-pixel", "Snapchat Pixel",
            "تتبع أداء إعلانات سناب شات وقِس التحويلات",
            "👻", "marketing", "التسويق",
            [new("pixelId", "Pixel ID", "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", true, null, "UUID الخاص بسناب شات")],
            5),

        new("google-search-console", "Google Search Console",
            "تحقق من ملكية موقعك على جوجل وراقب أداءه في نتائج البحث",
            "🔍", "seo", "تحسين محركات البحث",
            [new("verificationCode", "رمز التحقق", "google-site-verification=...", true, null, "المحتوى الكامل لوسم meta التحقق")],
            6),

        new("microsoft-clarity", "Microsoft Clarity",
            "خرائط حرارة وتسجيلات جلسات المستخدمين لفهم سلوكهم",
            "🌡️", "heatmaps", "خرائط حرارة",
            [new("projectId", "Project ID", "xxxxxxxxxx", true, "^[a-z0-9]+$", "حروف صغيرة وأرقام")],
            7),
    ];

    public IntegrationService(BoiootDbContext db, ILogger<IntegrationService> log)
    {
        _db  = db;
        _log = log;
    }

    // ── Read ─────────────────────────────────────────────────────────────────

    public async Task<List<IntegrationResponse>> GetAllAsync(CancellationToken ct = default)
    {
        var settings = await LoadAllSettingsAsync(ct);
        return _catalog
            .OrderBy(d => d.SortOrder)
            .Select(d => Merge(d, settings.GetValueOrDefault(d.Key)))
            .ToList();
    }

    public async Task<IntegrationResponse> GetByKeyAsync(string key, CancellationToken ct = default)
    {
        var def = GetDef(key);
        var settings = await LoadSettingsAsync(key, ct);
        return Merge(def, settings);
    }

    // ── Write ────────────────────────────────────────────────────────────────

    public async Task<IntegrationResponse> SaveSettingsAsync(
        string key,
        SaveIntegrationRequest request,
        Guid updatedBy,
        CancellationToken ct = default)
    {
        var def = GetDef(key);
        Validate(def, request.Config);

        var configJson = request.Config != null
            ? JsonSerializer.Serialize(request.Config)
            : null;

        await UpsertAsync(key, null, configJson, updatedBy.ToString(), ct);
        return await GetByKeyAsync(key, ct);
    }

    public async Task<IntegrationResponse> SetEnabledAsync(
        string key,
        bool enabled,
        Guid updatedBy,
        CancellationToken ct = default)
    {
        GetDef(key); // validate key exists
        await UpsertAsync(key, enabled, null, updatedBy.ToString(), ct);
        return await GetByKeyAsync(key, ct);
    }

    public async Task<IntegrationResponse> DisconnectAsync(string key, Guid updatedBy, CancellationToken ct = default)
    {
        GetDef(key);
        await _db.Database.ExecuteSqlRawAsync(
            $"""DELETE FROM "IntegrationSettings" WHERE "Key" = '{key.Replace("'", "''")}'""", ct);
        return await GetByKeyAsync(key, ct);
    }

    // ── Public (script injection) ─────────────────────────────────────────────

    public async Task<List<ActiveIntegrationResponse>> GetActiveConfigsAsync(CancellationToken ct = default)
    {
        var settings = await LoadAllSettingsAsync(ct);
        var result = new List<ActiveIntegrationResponse>();

        foreach (var def in _catalog)
        {
            if (!settings.TryGetValue(def.Key, out var row)) continue;
            if (!row.IsEnabled) continue;
            var cfg = ParseConfig(row.ConfigJson);
            if (cfg == null) continue;
            var allRequired = def.ConfigSchema
                .Where(f => f.Required)
                .All(f => cfg.ContainsKey(f.Key) && !string.IsNullOrWhiteSpace(cfg[f.Key]));
            if (!allRequired) continue;
            result.Add(new() { Key = def.Key, Config = cfg });
        }

        return result;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private IntegrationDef GetDef(string key) =>
        _catalog.FirstOrDefault(d => d.Key == key)
        ?? throw new IntegrationNotFoundException(key);

    private static void Validate(IntegrationDef def, Dictionary<string, string>? config)
    {
        if (config == null) return;
        foreach (var field in def.ConfigSchema)
        {
            if (!config.TryGetValue(field.Key, out var val) || string.IsNullOrWhiteSpace(val)) continue;
            if (field.Pattern is not null && !System.Text.RegularExpressions.Regex.IsMatch(val, field.Pattern))
                throw new IntegrationValidationException($"قيمة الحقل '{field.Label}' غير صالحة — {field.Hint ?? field.Pattern}");
        }
    }

    private static IntegrationResponse Merge(IntegrationDef def, (bool IsEnabled, string? ConfigJson, DateTime? UpdatedAt, string? UpdatedBy)? row)
    {
        var config = row.HasValue ? ParseConfig(row.Value.ConfigJson) : null;
        var isEnabled = row?.IsEnabled ?? false;
        var status = ComputeStatus(def, isEnabled, config);

        return new IntegrationResponse
        {
            Key           = def.Key,
            Name          = def.Name,
            Description   = def.Description,
            Icon          = def.Icon,
            Category      = def.Category,
            CategoryLabel = def.CategoryLabel,
            ConfigSchema  = def.ConfigSchema,
            SortOrder     = def.SortOrder,
            IsEnabled     = isEnabled,
            Config        = config,
            Status        = status,
            UpdatedAt     = row?.UpdatedAt,
            UpdatedBy     = row?.UpdatedBy,
        };
    }

    private static string ComputeStatus(IntegrationDef def, bool isEnabled, Dictionary<string, string>? config)
    {
        if (!isEnabled) return "inactive";
        if (config == null) return "incomplete";
        var allFilled = def.ConfigSchema
            .Where(f => f.Required)
            .All(f => config.ContainsKey(f.Key) && !string.IsNullOrWhiteSpace(config[f.Key]));
        return allFilled ? "active" : "incomplete";
    }

    private static Dictionary<string, string>? ParseConfig(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try { return JsonSerializer.Deserialize<Dictionary<string, string>>(json); }
        catch { return null; }
    }

    // ── DB helpers (raw SQL, no EF model) ────────────────────────────────────

    private record SettingsRow(bool IsEnabled, string? ConfigJson, DateTime? UpdatedAt, string? UpdatedBy);

    private async Task<Dictionary<string, (bool IsEnabled, string? ConfigJson, DateTime? UpdatedAt, string? UpdatedBy)>>
        LoadAllSettingsAsync(CancellationToken ct)
    {
        var result = new Dictionary<string, (bool, string?, DateTime?, string?)>();
        try
        {
            await _db.Database.OpenConnectionAsync(ct);
            var conn = _db.Database.GetDbConnection();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = """
                SELECT "Key","IsEnabled","ConfigJson","UpdatedAt","UpdatedBy"
                FROM "IntegrationSettings"
                """;
            await using var reader = await cmd.ExecuteReaderAsync(ct);
            while (await reader.ReadAsync(ct))
            {
                var k  = reader.GetString(0);
                var en = reader.GetBoolean(1);
                var cj = reader.IsDBNull(2) ? null : reader.GetString(2);
                var ua = reader.IsDBNull(3) ? (DateTime?)null : reader.GetDateTime(3);
                var ub = reader.IsDBNull(4) ? null : reader.GetString(4);
                result[k] = (en, cj, ua, ub);
            }
        }
        catch (Exception ex) { _log.LogWarning("[Integrations] LoadAll failed: {Msg}", ex.Message); }
        finally { await _db.Database.CloseConnectionAsync(); }
        return result;
    }

    private async Task<(bool IsEnabled, string? ConfigJson, DateTime? UpdatedAt, string? UpdatedBy)?> LoadSettingsAsync(
        string key, CancellationToken ct)
    {
        var all = await LoadAllSettingsAsync(ct);
        return all.TryGetValue(key, out var v) ? v : null;
    }

    private async Task UpsertAsync(string key, bool? isEnabled, string? configJson, string updatedBy, CancellationToken ct)
    {
        try
        {
            await _db.Database.OpenConnectionAsync(ct);
            var conn = _db.Database.GetDbConnection();
            await using var cmd = conn.CreateCommand();

            if (isEnabled.HasValue && configJson == null)
            {
                cmd.CommandText = $"""
                    INSERT INTO "IntegrationSettings"("Key","IsEnabled","ConfigJson","UpdatedBy","UpdatedAt")
                    VALUES ('{Esc(key)}', {(isEnabled.Value ? "true" : "false")}, NULL, '{Esc(updatedBy)}', NOW())
                    ON CONFLICT ("Key") DO UPDATE
                      SET "IsEnabled" = EXCLUDED."IsEnabled",
                          "UpdatedBy" = EXCLUDED."UpdatedBy",
                          "UpdatedAt" = NOW()
                    """;
            }
            else if (!isEnabled.HasValue && configJson != null)
            {
                var escapedJson = Esc(configJson);
                cmd.CommandText = $"""
                    INSERT INTO "IntegrationSettings"("Key","IsEnabled","ConfigJson","UpdatedBy","UpdatedAt")
                    VALUES ('{Esc(key)}', false, '{escapedJson}', '{Esc(updatedBy)}', NOW())
                    ON CONFLICT ("Key") DO UPDATE
                      SET "ConfigJson" = EXCLUDED."ConfigJson",
                          "UpdatedBy"  = EXCLUDED."UpdatedBy",
                          "UpdatedAt"  = NOW()
                    """;
            }
            else
            {
                return;
            }

            await cmd.ExecuteNonQueryAsync(ct);
        }
        finally { await _db.Database.CloseConnectionAsync(); }
    }

    private static string Esc(string s) => s.Replace("'", "''");
}
