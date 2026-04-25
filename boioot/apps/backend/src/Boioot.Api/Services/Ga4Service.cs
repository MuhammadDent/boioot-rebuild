using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.IdentityModel.Tokens;

namespace Boioot.Api.Services;

// ─────────────────────────────────────────────────────────────────────────────
// Ga4Service — Calls the GA4 Data API using a Google service account.
//
// Required environment variables (Replit Secrets / production env):
//   GA4_PROPERTY_ID  — Numeric GA4 property ID (just the number, e.g. "123456789")
//   GA4_CLIENT_EMAIL — Service account email (e.g. boioot@project.iam.gserviceaccount.com)
//   GA4_PRIVATE_KEY  — RSA private key PEM; keep \n literal (the service replaces them)
//
// When any variable is absent or GA4 is unreachable the service returns
// an all-zeros AnalyticsSummary without throwing — the dashboard still renders.
//
// HOW TO EXTEND:
//   Add new event names to TRACKED_EVENTS and update the MapRow() switch below.
// ─────────────────────────────────────────────────────────────────────────────

public record AnalyticsSummary(
    long   PropertyViews,
    long   BookingStarts,
    long   BookingSubmissions,
    long   WhatsappClicks,
    long   ListingsCreated,
    long   UpgradePromptViewed,
    long   UpgradeClicked,
    double UpgradeConversionRate,
    bool   IsLive,
    int    PeriodDays
);

public interface IGa4Service
{
    Task<AnalyticsSummary> GetSummaryAsync(int days = 30, CancellationToken ct = default);
}

public class Ga4Service : IGa4Service
{
    private static readonly string[] TrackedEvents =
    [
        "view_property",
        "booking_start",
        "booking_submit",
        "click_whatsapp",
        "upgrade_prompt_viewed",
        "upgrade_clicked",
        "listing_created",
    ];

    private const string TokenEndpoint    = "https://oauth2.googleapis.com/token";
    private const string Ga4ApiBase       = "https://analyticsdata.googleapis.com/v1beta/properties";
    private const string Scope            = "https://www.googleapis.com/auth/analytics.readonly";
    private const string GrantType        = "urn:ietf:params:oauth:grant-type:jwt-bearer";

    private readonly HttpClient       _http;
    private readonly ILogger<Ga4Service> _log;
    private readonly string?          _propertyId;
    private readonly string?          _clientEmail;
    private readonly string?          _privateKey;

    public Ga4Service(HttpClient http, ILogger<Ga4Service> log, IConfiguration config)
    {
        _http        = http;
        _log         = log;

        // Prefer environment variables (Replit Secrets); fall back to appsettings values.
        _propertyId  = Environment.GetEnvironmentVariable("GA4_PROPERTY_ID")
                    ?? config["Analytics:Ga4:PropertyId"];
        _clientEmail = Environment.GetEnvironmentVariable("GA4_CLIENT_EMAIL")
                    ?? config["Analytics:Ga4:ClientEmail"];
        _privateKey  = Environment.GetEnvironmentVariable("GA4_PRIVATE_KEY")
                    ?? config["Analytics:Ga4:PrivateKey"];
    }

    public async Task<AnalyticsSummary> GetSummaryAsync(int days = 30, CancellationToken ct = default)
    {
        // ── Graceful degradation: return zeros when not configured ────────────
        if (string.IsNullOrWhiteSpace(_propertyId)  ||
            string.IsNullOrWhiteSpace(_clientEmail) ||
            string.IsNullOrWhiteSpace(_privateKey))
        {
            _log.LogDebug("[GA4] Credentials not configured — returning empty summary.");
            return Empty(days);
        }

        try
        {
            var token  = await GetAccessTokenAsync(ct);
            var counts = await RunReportAsync(token, _propertyId, days, ct);
            return BuildSummary(counts, days, isLive: true);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "[GA4] Failed to fetch analytics — returning empty summary.");
            return Empty(days);
        }
    }

    // ── Step 1: Get OAuth2 access token via service account JWT ──────────────

    private async Task<string> GetAccessTokenAsync(CancellationToken ct)
    {
        // Normalise escaped newlines that appear in env vars / JSON storage.
        var pem = _privateKey!
            .Replace("\\n", "\n")
            .Trim();

        // Sign the JWT with the RSA private key (PKCS#8 PEM).
        using var rsa = RSA.Create();
        rsa.ImportFromPem(pem);

        var now     = DateTimeOffset.UtcNow;
        var key     = new RsaSecurityKey(rsa.ExportParameters(includePrivateParameters: true));
        var creds   = new SigningCredentials(key, SecurityAlgorithms.RsaSha256);

        var jwt = new JwtSecurityToken(
            issuer:   _clientEmail,
            audience: TokenEndpoint,
            claims:   [
                new Claim("scope", Scope),
                new Claim(JwtRegisteredClaimNames.Iat,
                          now.ToUnixTimeSeconds().ToString(),
                          ClaimValueTypes.Integer64),
            ],
            notBefore: now.UtcDateTime,
            expires:   now.AddHours(1).UtcDateTime,
            signingCredentials: creds
        );

        var assertion = new JwtSecurityTokenHandler().WriteToken(jwt);

        // Exchange the signed JWT for an access token.
        var form = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = GrantType,
            ["assertion"]  = assertion,
        });

        var response = await _http.PostAsync(TokenEndpoint, form, ct);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(ct);
        return body.GetProperty("access_token").GetString()
            ?? throw new InvalidOperationException("access_token missing in Google OAuth2 response");
    }

    // ── Step 2: Call GA4 RunReport ────────────────────────────────────────────

    private async Task<Dictionary<string, long>> RunReportAsync(
        string token, string propertyId, int days, CancellationToken ct)
    {
        var url     = $"{Ga4ApiBase}/{propertyId}:runReport";
        var payload = new
        {
            dateRanges = new[] { new { startDate = $"{days}daysAgo", endDate = "today" } },
            dimensions = new[] { new { name = "eventName" } },
            metrics    = new[] { new { name = "eventCount" } },
            dimensionFilter = new
            {
                filter = new
                {
                    fieldName     = "eventName",
                    inListFilter  = new { values = TrackedEvents },
                }
            }
        };

        var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(payload),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _http.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        var body  = await response.Content.ReadFromJsonAsync<JsonElement>(ct);
        var counts = new Dictionary<string, long>(StringComparer.OrdinalIgnoreCase);

        if (!body.TryGetProperty("rows", out var rows)) return counts;

        foreach (var row in rows.EnumerateArray())
        {
            var eventName = row
                .GetProperty("dimensionValues")[0]
                .GetProperty("value")
                .GetString() ?? "";

            var countStr  = row
                .GetProperty("metricValues")[0]
                .GetProperty("value")
                .GetString() ?? "0";

            if (long.TryParse(countStr, out var count))
                counts[eventName] = count;
        }

        return counts;
    }

    // ── Build response DTO ────────────────────────────────────────────────────

    private static AnalyticsSummary BuildSummary(
        Dictionary<string, long> c, int days, bool isLive)
    {
        var promptViewed = Get(c, "upgrade_prompt_viewed");
        var clicked      = Get(c, "upgrade_clicked");
        var convRate     = promptViewed > 0
            ? Math.Round((double)clicked / promptViewed, 4)
            : 0.0;

        return new AnalyticsSummary(
            PropertyViews:        Get(c, "view_property"),
            BookingStarts:        Get(c, "booking_start"),
            BookingSubmissions:   Get(c, "booking_submit"),
            WhatsappClicks:       Get(c, "click_whatsapp"),
            ListingsCreated:      Get(c, "listing_created"),
            UpgradePromptViewed:  promptViewed,
            UpgradeClicked:       clicked,
            UpgradeConversionRate: convRate,
            IsLive:               isLive,
            PeriodDays:           days
        );
    }

    private static AnalyticsSummary Empty(int days) =>
        new(0, 0, 0, 0, 0, 0, 0, 0.0, false, days);

    private static long Get(Dictionary<string, long> d, string key) =>
        d.TryGetValue(key, out var v) ? v : 0L;
}
