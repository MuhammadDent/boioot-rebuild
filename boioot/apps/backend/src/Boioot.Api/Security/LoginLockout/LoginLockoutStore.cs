using System.Collections.Concurrent;
using Microsoft.Extensions.Options;

namespace Boioot.Api.Security.LoginLockout;

/// <summary>
/// In-memory, thread-safe implementation of <see cref="ILoginLockoutStore"/>.
/// Uses <see cref="TimeProvider"/> so the lockout window can be tested
/// deterministically without real delays.
/// </summary>
public sealed class LoginLockoutStore : ILoginLockoutStore
{
    private sealed class Entry
    {
        public int FailureCount;
        public DateTimeOffset WindowStart;
        public DateTimeOffset? LockedUntil;
    }

    private readonly ConcurrentDictionary<string, Entry> _entries = new();
    private readonly IOptions<LoginLockoutOptions> _options;
    private readonly TimeProvider _clock;

    public LoginLockoutStore(IOptions<LoginLockoutOptions> options, TimeProvider clock)
    {
        _options = options;
        _clock   = clock;
    }

    public LockoutStatus Check(string key)
    {
        if (string.IsNullOrEmpty(key) || !_entries.TryGetValue(key, out var entry))
            return LockoutStatus.NotLocked;

        lock (entry)
        {
            var now = _clock.GetUtcNow();
            if (entry.LockedUntil is { } until)
            {
                if (until > now)
                    return new LockoutStatus(true, until - now);

                // Lockout has expired — drop the entry so the next failures start
                // a fresh window.
                _entries.TryRemove(key, out _);
            }

            return LockoutStatus.NotLocked;
        }
    }

    public void RegisterFailure(string key)
    {
        if (string.IsNullOrEmpty(key)) return;

        var opts = _options.Value;
        var now  = _clock.GetUtcNow();
        var entry = _entries.GetOrAdd(key, _ => new Entry { WindowStart = now });

        lock (entry)
        {
            var lockoutExpired = entry.LockedUntil is { } until && until <= now;
            var windowElapsed  = now - entry.WindowStart > opts.FailureWindow;

            if (lockoutExpired || windowElapsed)
            {
                entry.FailureCount = 0;
                entry.WindowStart  = now;
                entry.LockedUntil  = null;
            }

            entry.FailureCount++;

            if (entry.FailureCount >= opts.MaxFailedAttempts)
                entry.LockedUntil = now + opts.LockoutDuration;
        }
    }

    public void RegisterSuccess(string key)
    {
        if (string.IsNullOrEmpty(key)) return;
        _entries.TryRemove(key, out _);
    }
}
