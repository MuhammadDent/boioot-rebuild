namespace Boioot.Application.Features.Storage;

/// <summary>
/// Normalizes image URLs that were stored with a custom domain that has no DNS record.
///
/// Root cause: "assets.boioot.net" was configured as the R2 public base URL
/// (Storage__R2__PublicBaseUrl) before the corresponding CNAME record was added
/// in GoDaddy DNS.  The subdomain resolves as NXDOMAIN, so every image stored
/// with that prefix shows a broken-image icon in the browser.
///
/// The r2.dev URL (pub-4b43b8a4b24b4a4fb244f2148c5c6495.r2.dev) is always
/// public and returns HTTP 200.  All API response paths run URLs through
/// Normalize() so the frontend receives a working link regardless of what is
/// stored in the database.
///
/// Once "assets.boioot.net" resolves correctly (CNAME added in GoDaddy), this
/// helper becomes a no-op and can be removed.
/// </summary>
public static class ImageUrlHelper
{
    private const string BrokenDomain  = "https://assets.boioot.net/";
    private const string WorkingDomain = "https://pub-4b43b8a4b24b4a4fb244f2148c5c6495.r2.dev/";

    /// <summary>
    /// If <paramref name="url"/> starts with the broken custom domain, rewrites it
    /// to the working r2.dev URL.  Returns the original value for all other URLs.
    /// </summary>
    public static string? Normalize(string? url)
    {
        if (string.IsNullOrEmpty(url)) return url;

        if (url.StartsWith(BrokenDomain, StringComparison.OrdinalIgnoreCase))
            return WorkingDomain + url[BrokenDomain.Length..];

        return url;
    }
}
