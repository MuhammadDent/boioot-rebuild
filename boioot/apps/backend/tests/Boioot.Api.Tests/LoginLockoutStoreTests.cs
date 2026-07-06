using Boioot.Api.Security.LoginLockout;
using Microsoft.Extensions.Options;
using Xunit;

namespace Boioot.Api.Tests;

public class LoginLockoutStoreTests
{
    private const string Key = "login:ip:203.0.113.7";

    private static (LoginLockoutStore store, TestTimeProvider clock) CreateStore(
        int maxFailed = 3,
        int failureWindowMinutes = 15,
        int lockoutMinutes = 15)
    {
        var clock = new TestTimeProvider(new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero));
        var opts = Options.Create(new LoginLockoutOptions
        {
            MaxFailedAttempts = maxFailed,
            FailureWindow     = TimeSpan.FromMinutes(failureWindowMinutes),
            LockoutDuration   = TimeSpan.FromMinutes(lockoutMinutes),
        });
        return (new LoginLockoutStore(opts, clock), clock);
    }

    [Fact]
    public void FailuresBelowThreshold_AreNotLocked()
    {
        var (store, _) = CreateStore(maxFailed: 3);

        store.RegisterFailure(Key);
        store.RegisterFailure(Key);

        Assert.False(store.Check(Key).IsLocked);
    }

    [Fact]
    public void FailuresReachingThreshold_TriggerLockout()
    {
        var (store, _) = CreateStore(maxFailed: 3);

        store.RegisterFailure(Key);
        store.RegisterFailure(Key);
        store.RegisterFailure(Key);

        var status = store.Check(Key);
        Assert.True(status.IsLocked);
        Assert.True(status.RetryAfter > TimeSpan.Zero);
    }

    [Fact]
    public void Lockout_RemainsActive_UntilDurationElapses()
    {
        var (store, clock) = CreateStore(maxFailed: 3, lockoutMinutes: 15);
        for (var i = 0; i < 3; i++) store.RegisterFailure(Key);

        clock.Advance(TimeSpan.FromMinutes(14));
        Assert.True(store.Check(Key).IsLocked);

        clock.Advance(TimeSpan.FromMinutes(1) + TimeSpan.FromSeconds(1));
        Assert.False(store.Check(Key).IsLocked);
    }

    [Fact]
    public void RegisterSuccess_ClearsFailureCount()
    {
        var (store, _) = CreateStore(maxFailed: 3);

        store.RegisterFailure(Key);
        store.RegisterFailure(Key);
        store.RegisterSuccess(Key);

        // Counter was reset, so a single subsequent failure must not lock.
        store.RegisterFailure(Key);
        Assert.False(store.Check(Key).IsLocked);
    }

    [Fact]
    public void FailuresOutsideWindow_DoNotAccumulate()
    {
        var (store, clock) = CreateStore(maxFailed: 3, failureWindowMinutes: 10);

        store.RegisterFailure(Key);
        store.RegisterFailure(Key);

        clock.Advance(TimeSpan.FromMinutes(11)); // failure window elapsed
        store.RegisterFailure(Key);              // fresh window, count = 1

        Assert.False(store.Check(Key).IsLocked);
    }

    [Fact]
    public void DifferentKeys_AreIsolated()
    {
        var (store, _) = CreateStore(maxFailed: 3);

        for (var i = 0; i < 3; i++) store.RegisterFailure("login:ip:a");

        Assert.True(store.Check("login:ip:a").IsLocked);
        Assert.False(store.Check("login:ip:b").IsLocked);
    }
}
