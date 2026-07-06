namespace Boioot.Api.Security.LoginLockout;

/// <summary>
/// Configuration for the sticky login lockout that protects the credential
/// endpoint against brute force. Bound from the "LoginLockout" configuration
/// section; the defaults apply when the section is absent.
/// </summary>
public sealed class LoginLockoutOptions
{
    public const string SectionName = "LoginLockout";

    /// <summary>Number of failed login attempts (within <see cref="FailureWindow"/>)
    /// that trips a lockout.</summary>
    public int MaxFailedAttempts { get; set; } = 5;

    /// <summary>Rolling window over which consecutive failures are counted.</summary>
    public TimeSpan FailureWindow { get; set; } = TimeSpan.FromMinutes(15);

    /// <summary>How long a lockout stays active once tripped. During this period
    /// every login request for the key is rejected with 429, regardless of whether
    /// the submitted credentials are correct.</summary>
    public TimeSpan LockoutDuration { get; set; } = TimeSpan.FromMinutes(15);
}
