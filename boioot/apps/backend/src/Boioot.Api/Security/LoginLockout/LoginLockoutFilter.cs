using Boioot.Application.Exceptions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.Infrastructure;

namespace Boioot.Api.Security.LoginLockout;

/// <summary>
/// Enforces the login lockout <em>before</em> authentication. Applied to the login
/// action, this filter runs before the controller (and therefore before credential
/// verification in the auth service). While a lockout is active every request is
/// rejected with HTTP 429 — a valid password cannot bypass the lockout because the
/// action delegate is never invoked. Failed logins (401) are recorded; a successful
/// login (2xx) clears the counter.
/// </summary>
public sealed class LoginLockoutFilter : IAsyncActionFilter
{
    private const string LockedMessageAr = "محاولات كثيرة جداً. الرجاء المحاولة مرة أخرى بعد قليل.";
    private const string LockedCode      = "RATE_LIMITED";

    private readonly ILoginLockoutStore _store;
    private readonly ILogger<LoginLockoutFilter> _logger;

    public LoginLockoutFilter(ILoginLockoutStore store, ILogger<LoginLockoutFilter> logger)
    {
        _store  = store;
        _logger = logger;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var key    = BuildKey(context);
        var status = _store.Check(key);

        if (status.IsLocked)
        {
            var retryAfterSeconds = Math.Max(1, (int)Math.Ceiling(status.RetryAfter.TotalSeconds));
            context.HttpContext.Response.Headers.RetryAfter = retryAfterSeconds.ToString();
            context.Result = new JsonResult(new { error = LockedMessageAr, code = LockedCode })
            {
                StatusCode = StatusCodes.Status429TooManyRequests,
            };
            _logger.LogWarning("Login lockout active for {Key}; request rejected with 429.", key);
            return; // Authentication is skipped entirely while locked out.
        }

        var executed = await next();

        var resultStatus = ResolveStatusCode(executed);
        if (resultStatus == StatusCodes.Status401Unauthorized)
            _store.RegisterFailure(key);
        else if (resultStatus is >= 200 and < 300)
            _store.RegisterSuccess(key);
    }

    /// <summary>
    /// The lockout key is the originating client IP (the same source the "auth"
    /// rate-limit policy partitions by). <see cref="Microsoft.AspNetCore.Builder.ForwardedHeadersExtensions"/>
    /// runs earlier in the pipeline, so <c>RemoteIpAddress</c> reflects the real
    /// client behind the proxy rather than the proxy itself.
    /// </summary>
    private static string BuildKey(ActionExecutingContext context)
    {
        var ip = context.HttpContext.Connection.RemoteIpAddress?.ToString();
        return "login:ip:" + (string.IsNullOrEmpty(ip) ? "unknown" : ip);
    }

    private static int ResolveStatusCode(ActionExecutedContext executed)
    {
        // The auth service signals a failed login by throwing BoiootException(401);
        // the global exception handler later converts it to the HTTP response.
        if (executed.Exception is BoiootException boioot)
            return boioot.StatusCode;

        if (executed.Result is IStatusCodeActionResult { StatusCode: { } code })
            return code;

        return executed.HttpContext.Response.StatusCode;
    }
}
