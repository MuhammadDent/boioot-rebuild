using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Boioot.Application.Features.Auth.DTOs;
using Boioot.Application.Features.Auth.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IHostEnvironment _env;

    private const string CookieName = "boioot_rt";
    private const string CookiePath = "/api/auth";

    public AuthController(IAuthService authService, IHostEnvironment env)
    {
        _authService = authService;
        _env         = env;
    }

    // ── Register ──────────────────────────────────────────────────────────────

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        var ip        = GetClientIp();
        var userAgent = Request.Headers.UserAgent.ToString();
        var result    = await _authService.RegisterAsync(request, ct);

        // Move refresh token to HttpOnly cookie
        SetRefreshCookie(result.RefreshToken!, result.RefreshTokenExpiresAt!.Value);

        return StatusCode(201, StripRefreshToken(result));
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var ip        = GetClientIp();
        var userAgent = Request.Headers.UserAgent.ToString();
        var result    = await _authService.LoginAsync(request, ip, userAgent, ct);

        // Move refresh token to HttpOnly cookie
        SetRefreshCookie(result.RefreshToken!, result.RefreshTokenExpiresAt!.Value);

        return Ok(StripRefreshToken(result));
    }

    // ── Refresh ───────────────────────────────────────────────────────────────

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(CancellationToken ct)
    {
        var rawToken = Request.Cookies[CookieName];
        if (string.IsNullOrWhiteSpace(rawToken))
            return Unauthorized(new { error = "لم يتم العثور على رمز التحديث" });

        var ip        = GetClientIp();
        var userAgent = Request.Headers.UserAgent.ToString();
        var result    = await _authService.RefreshAsync(rawToken, ip, userAgent, ct);

        // Replace cookie with rotated token
        SetRefreshCookie(result.RefreshToken!, result.RefreshTokenExpiresAt!.Value);

        return Ok(StripRefreshToken(result));
    }

    // ── Logout (revoke single refresh token) ──────────────────────────────────

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        var rawToken = Request.Cookies[CookieName];
        if (!string.IsNullOrWhiteSpace(rawToken))
        {
            var ip = GetClientIp();
            await _authService.RevokeRefreshTokenAsync(rawToken, ip, ct);
        }

        ClearRefreshCookie();
        return NoContent();
    }

    // ── Logout All (revoke all active tokens for current user) ────────────────

    [Authorize]
    [HttpPost("logout-all")]
    public async Task<IActionResult> LogoutAll(CancellationToken ct)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var ip = GetClientIp();
        await _authService.RevokeAllRefreshTokensAsync(userId, ip, ct);

        ClearRefreshCookie();
        return NoContent();
    }

    // ── Profile ───────────────────────────────────────────────────────────────

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var profile = await _authService.GetProfileAsync(userId, ct);
        return Ok(profile);
    }

    [Authorize]
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request, CancellationToken ct)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var profile = await _authService.UpdateProfileAsync(userId, request, ct);
        return Ok(profile);
    }

    [Authorize]
    [HttpPost("change-email")]
    public async Task<IActionResult> ChangeEmail([FromBody] ChangeEmailRequest request, CancellationToken ct)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var profile = await _authService.ChangeEmailAsync(userId, request, ct);
        return Ok(profile);
    }

    // ── Sessions (Phase 1B) ───────────────────────────────────────────────────

    [Authorize]
    [HttpGet("sessions")]
    public async Task<IActionResult> GetSessions(CancellationToken ct)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var rawToken         = Request.Cookies[CookieName];
        var currentTokenHash = rawToken is not null ? HashToken(rawToken) : null;

        var sessions = await _authService.GetSessionsAsync(userId, currentTokenHash, ct);
        return Ok(sessions);
    }

    [Authorize]
    [HttpDelete("sessions/{sessionId:guid}")]
    public async Task<IActionResult> RevokeSession(Guid sessionId, CancellationToken ct)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var ip = GetClientIp();
        await _authService.RevokeSessionByIdAsync(sessionId, userId, ip, ct);
        return NoContent();
    }

    [Authorize]
    [HttpDelete("sessions/others")]
    public async Task<IActionResult> RevokeOtherSessions(CancellationToken ct)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var rawToken         = Request.Cookies[CookieName];
        var currentTokenHash = rawToken is not null ? HashToken(rawToken) : null;

        var ip = GetClientIp();
        await _authService.RevokeOtherSessionsAsync(userId, currentTokenHash, ip, ct);
        return NoContent();
    }

    // ── Cookie helpers ────────────────────────────────────────────────────────

    private void SetRefreshCookie(string rawToken, DateTime expiresAt)
    {
        Response.Cookies.Append(CookieName, rawToken, new CookieOptions
        {
            HttpOnly  = true,
            Secure    = !_env.IsDevelopment(),
            SameSite  = SameSiteMode.Lax,
            Path      = CookiePath,
            Expires   = expiresAt,
        });
    }

    private void ClearRefreshCookie()
    {
        Response.Cookies.Append(CookieName, string.Empty, new CookieOptions
        {
            HttpOnly = true,
            Secure   = !_env.IsDevelopment(),
            SameSite = SameSiteMode.Lax,
            Path     = CookiePath,
            Expires  = DateTimeOffset.UnixEpoch,
        });
    }

    /// <summary>
    /// Returns a sanitised copy of the response — refresh token material
    /// never leaves the cookie and must not be sent to the browser via JSON.
    /// </summary>
    private static AuthResponse StripRefreshToken(AuthResponse response)
    {
        response.RefreshToken         = null;
        response.RefreshTokenExpiresAt = null;
        return response;
    }

    private static string HashToken(string token)
    {
        var bytes = System.Text.Encoding.UTF8.GetBytes(token);
        var hash  = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private string? GetClientIp()
    {
        var forwarded = Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwarded))
            return forwarded.Split(',')[0].Trim();

        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }
}
