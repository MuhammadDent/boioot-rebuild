namespace Boioot.Api.Security.LoginLockout;

/// <summary>Result of a lockout check for a given key.</summary>
public readonly record struct LockoutStatus(bool IsLocked, TimeSpan RetryAfter)
{
    public static readonly LockoutStatus NotLocked = new(false, TimeSpan.Zero);
}

/// <summary>
/// Tracks failed login attempts per key and enforces a sticky lockout. The store
/// is the single source of truth for the lockout, so it is enforced on the backend
/// for every client (web, mobile, API) that reaches the login endpoint.
/// </summary>
public interface ILoginLockoutStore
{
    /// <summary>Returns whether the key is currently locked out.</summary>
    LockoutStatus Check(string key);

    /// <summary>Records a failed login attempt, tripping a lockout once the
    /// configured threshold is reached within the failure window.</summary>
    void RegisterFailure(string key);

    /// <summary>Clears the failure/lockout state for the key after a successful login.</summary>
    void RegisterSuccess(string key);
}
