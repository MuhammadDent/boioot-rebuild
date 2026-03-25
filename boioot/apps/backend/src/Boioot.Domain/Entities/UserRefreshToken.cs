namespace Boioot.Domain.Entities;

/// <summary>
/// Persisted refresh token record (Phase 1A).
/// Raw token is never stored — only a SHA-256 hex hash.
/// Supports rotation: each refresh revokes the old record and creates a new one.
/// </summary>
public class UserRefreshToken
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    /// <summary>SHA-256 hex hash of the raw opaque refresh token.</summary>
    public string TokenHash { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; }
    public DateTime ExpiresAtUtc { get; set; }

    /// <summary>Set when this token is revoked (logout / rotation).</summary>
    public DateTime? RevokedAtUtc { get; set; }

    /// <summary>Hash of the token that replaced this one during rotation.</summary>
    public string? ReplacedByTokenHash { get; set; }

    public string? CreatedByIp { get; set; }
    public string? RevokedByIp  { get; set; }
    public string? UserAgent    { get; set; }

    // ── Navigation ───────────────────────────────────────────────────────────
    public User User { get; set; } = null!;

    // ── Computed ─────────────────────────────────────────────────────────────
    public bool IsActive  => RevokedAtUtc == null && DateTime.UtcNow < ExpiresAtUtc;
    public bool IsExpired => DateTime.UtcNow >= ExpiresAtUtc;
    public bool IsRevoked => RevokedAtUtc != null;
}
