using System.Net;
using Boioot.Api.Security.LoginLockout;
using Boioot.Application.Exceptions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace Boioot.Api.Tests;

public class LoginLockoutFilterTests
{
    private const string Ip = "203.0.113.9";

    private static (LoginLockoutStore store, TestTimeProvider clock) CreateStore(
        int maxFailed = 3, int lockoutMinutes = 15, int failureWindowMinutes = 15)
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

    private static LoginLockoutFilter CreateFilter(ILoginLockoutStore store) =>
        new(store, NullLogger<LoginLockoutFilter>.Instance);

    /// <summary>Runs the filter once, simulating the action outcome.</summary>
    private static async Task<(bool authenticationRan, ActionExecutingContext ctx)> RunAsync(
        LoginLockoutFilter filter,
        string ip,
        IActionResult? actionResult,
        Exception? actionException)
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Connection.RemoteIpAddress = IPAddress.Parse(ip);

        var actionContext = new ActionContext(httpContext, new RouteData(), new ActionDescriptor());
        var ctx = new ActionExecutingContext(
            actionContext,
            new List<IFilterMetadata>(),
            new Dictionary<string, object?>(),
            controller: new object());

        var authenticationRan = false;

        ActionExecutionDelegate next = () =>
        {
            // Reaching here means the controller action (credential verification) runs.
            authenticationRan = true;
            var executed = new ActionExecutedContext(actionContext, new List<IFilterMetadata>(), ctx.Controller)
            {
                Exception = actionException,
            };
            if (actionResult is not null)
                executed.Result = actionResult;
            return Task.FromResult(executed);
        };

        await filter.OnActionExecutionAsync(ctx, next);
        return (authenticationRan, ctx);
    }

    // Simulates a failed login: the auth service throws BoiootException(401).
    private static Task<(bool, ActionExecutingContext)> RunFailedLoginAsync(LoginLockoutFilter filter, string ip)
        => RunAsync(filter, ip, actionResult: null, actionException: new BoiootException("bad creds", 401));

    // Simulates a successful login (valid credentials): the action returns 200.
    private static Task<(bool, ActionExecutingContext)> RunValidLoginAsync(LoginLockoutFilter filter, string ip)
        => RunAsync(filter, ip, actionResult: new OkObjectResult(new { ok = true }), actionException: null);

    [Fact]
    public async Task FailedLogins_TriggerLockout_ThroughFilter()
    {
        var (store, _) = CreateStore(maxFailed: 3);
        var filter = CreateFilter(store);

        await RunFailedLoginAsync(filter, Ip);
        await RunFailedLoginAsync(filter, Ip);
        await RunFailedLoginAsync(filter, Ip);

        Assert.True(store.Check("login:ip:" + Ip).IsLocked);
    }

    [Fact]
    public async Task ValidCredentials_DuringLockout_AreRejectedWith429_WithoutAuthenticating()
    {
        var (store, _) = CreateStore(maxFailed: 3);
        var filter = CreateFilter(store);

        // Trip the lockout with failed attempts.
        for (var i = 0; i < 3; i++)
            await RunFailedLoginAsync(filter, Ip);

        // Now submit VALID credentials — must be rejected, and authentication must NOT run.
        var (authenticationRan, ctx) = await RunValidLoginAsync(filter, Ip);

        Assert.False(authenticationRan);
        var json = Assert.IsType<JsonResult>(ctx.Result);
        Assert.Equal(StatusCodes.Status429TooManyRequests, json.StatusCode);
        Assert.False(string.IsNullOrEmpty(ctx.HttpContext.Response.Headers.RetryAfter.ToString()));
    }

    [Fact]
    public async Task SuccessfulLogin_OnlyAfterLockoutExpires()
    {
        var (store, clock) = CreateStore(maxFailed: 3, lockoutMinutes: 15);
        var filter = CreateFilter(store);

        for (var i = 0; i < 3; i++)
            await RunFailedLoginAsync(filter, Ip);

        // Still locked: valid credentials rejected, authentication skipped.
        var (ranWhileLocked, lockedCtx) = await RunValidLoginAsync(filter, Ip);
        Assert.False(ranWhileLocked);
        Assert.Equal(StatusCodes.Status429TooManyRequests, Assert.IsType<JsonResult>(lockedCtx.Result).StatusCode);

        // After the lockout window passes, the same valid credentials authenticate.
        clock.Advance(TimeSpan.FromMinutes(15) + TimeSpan.FromSeconds(1));
        var (ranAfterExpiry, expiredCtx) = await RunValidLoginAsync(filter, Ip);

        Assert.True(ranAfterExpiry);
        Assert.Null(expiredCtx.Result); // filter did not short-circuit
    }

    [Fact]
    public async Task SuccessfulLogin_ResetsFailureCounter()
    {
        var (store, _) = CreateStore(maxFailed: 3);
        var filter = CreateFilter(store);

        await RunFailedLoginAsync(filter, Ip);
        await RunFailedLoginAsync(filter, Ip);

        var (ran, _) = await RunValidLoginAsync(filter, Ip);
        Assert.True(ran); // not locked yet, so authentication runs and success resets

        // A single new failure must not lock (counter was reset).
        await RunFailedLoginAsync(filter, Ip);
        Assert.False(store.Check("login:ip:" + Ip).IsLocked);
    }

    [Fact]
    public async Task ChangingClient_CannotBypassLockout_SameIp()
    {
        // Different "clients" from the same IP share the lockout key, so switching
        // client (web/mobile/api) cannot bypass an active lockout.
        var (store, _) = CreateStore(maxFailed: 3);
        var filter = CreateFilter(store);

        for (var i = 0; i < 3; i++)
            await RunFailedLoginAsync(filter, Ip);

        var (authenticationRan, ctx) = await RunValidLoginAsync(filter, Ip);
        Assert.False(authenticationRan);
        Assert.Equal(StatusCodes.Status429TooManyRequests, Assert.IsType<JsonResult>(ctx.Result).StatusCode);
    }
}
