namespace Boioot.Application.Features.Auth.DTOs;

public class SessionResponse
{
    public Guid Id { get; set; }

    /// <summary>True if this record is the session making the current request.</summary>
    public bool IsCurrent { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? RevokedAtUtc { get; set; }

    public string? CreatedByIp { get; set; }
    public string? UserAgent { get; set; }
}
