using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Boioot.Application.Exceptions;
using Boioot.Application.Features.Auth.DTOs;
using Boioot.Application.Features.Auth.Interfaces;
using Boioot.Domain.Constants;
using Boioot.Domain.Entities;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Features.Rbac;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace Boioot.Infrastructure.Features.Auth;

public class AuthService : IAuthService
{
    private readonly BoiootDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;
    private readonly RbacRepository _rbac;

    public AuthService(
        BoiootDbContext context,
        IConfiguration configuration,
        ILogger<AuthService> logger,
        RbacRepository rbac)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
        _rbac = rbac;
    }

    // ── Register ──────────────────────────────────────────────────────────────

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var emailLower = request.Email.ToLowerInvariant();

        var emailExists = await _context.Users
            .AnyAsync(u => u.Email == emailLower, ct);

        if (emailExists)
            throw new BoiootException("البريد الإلكتروني مستخدم بالفعل", 409);

        var role = Enum.TryParse<UserRole>(request.Role, out var parsedRole)
            && parsedRole != UserRole.Admin
            ? parsedRole
            : UserRole.User;

        var userCode = await GenerateUserCodeAsync(role, ct);

        var user = new User
        {
            UserCode = userCode,
            FullName = request.FullName.Trim(),
            Email = emailLower,
            Phone = request.Phone?.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = role,
            IsActive = true
        };

        _context.Users.Add(user);

        // ── Auto-create Company + Agent for CompanyOwner accounts ─────────────
        if (role is UserRole.CompanyOwner)
        {
            var businessName = string.IsNullOrWhiteSpace(request.CompanyName)
                ? request.FullName.Trim()
                : request.CompanyName.Trim();

            var companyType = request.CompanyType ?? "DeveloperCompany";

            var company = new Company
            {
                Name        = businessName,
                Email       = emailLower,
                Phone       = request.Phone?.Trim(),
                CompanyType = companyType,
            };

            _context.Companies.Add(company);

            var agent = new Agent
            {
                User    = user,
                Company = company,
            };

            _context.Agents.Add(agent);

            _logger.LogInformation(
                "Auto-created Company '{BusinessName}' ({CompanyType}) and Agent for {Email}",
                businessName, companyType, emailLower);
        }

        // ── Auto-create Account + Free Subscription for all commercial roles ──
        if (role is UserRole.CompanyOwner or UserRole.Owner or UserRole.Agent or UserRole.Broker)
        {
            var accountType = role switch
            {
                UserRole.CompanyOwner => AccountType.Company,
                UserRole.Owner        => AccountType.Individual,
                _                     => AccountType.Office,
            };

            var now = DateTime.UtcNow;

            var account = new Account
            {
                Name               = request.FullName.Trim(),
                AccountType        = accountType,
                CreatedByUserId    = user.Id,
                PrimaryAdminUserId = user.Id,
                IsActive           = true,
                CreatedAt          = now,
                UpdatedAt          = now,
            };
            _context.Accounts.Add(account);

            var accountUser = new AccountUser
            {
                AccountId            = account.Id,
                UserId               = user.Id,
                OrganizationUserRole = OrganizationUserRole.Admin,
                IsPrimary            = true,
                IsActive             = true,
                JoinedAt             = now,
            };
            _context.AccountUsers.Add(accountUser);

            var freePlanId = new Guid("00000001-0000-0000-0000-000000000000");

            var freeSub = new Subscription
            {
                AccountId  = account.Id,
                PlanId     = freePlanId,
                Status     = SubscriptionStatus.Active,
                StartDate  = now,
                EndDate    = null,
                IsActive   = true,
                AutoRenew  = false,
                PaymentRef = "free",
                CreatedAt  = now,
                UpdatedAt  = now,
            };
            _context.Subscriptions.Add(freeSub);

            _context.SubscriptionHistories.Add(new SubscriptionHistory
            {
                SubscriptionId  = freeSub.Id,
                EventType       = "created",
                NewPlanId       = freePlanId,
                Notes           = "تفعيل تلقائي للباقة المجانية عند التسجيل",
                CreatedByUserId = user.Id,
                CreatedAtUtc    = now,
            });

            _logger.LogInformation(
                "Auto-created Account + Free subscription for {Email} (role={Role})",
                emailLower, role);
        }

        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("New user registered: {Email} | Role: {Role}", emailLower, user.Role);

        // Register issues a refresh token with rememberMe=false
        return await BuildAuthResponseAsync(user, rememberMe: false, ipAddress: null, userAgent: null, ct);
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    public async Task<AuthResponse> LoginAsync(
        LoginRequest request,
        string? ipAddress = null,
        string? userAgent = null,
        CancellationToken ct = default)
    {
        var emailLower = request.Email.ToLowerInvariant();

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == emailLower, ct);

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            _logger.LogWarning("Failed login attempt: {Email}", emailLower);
            throw new BoiootException("بيانات الدخول غير صحيحة", 401);
        }

        if (!user.IsActive)
        {
            _logger.LogWarning("Login attempt on inactive account: {Email}", emailLower);
            throw new BoiootException("الحساب غير مفعّل. يرجى التواصل مع الدعم", 403);
        }

        _logger.LogInformation(
            "User logged in: {Email} | Role: {Role} | RememberMe: {RememberMe}",
            emailLower, user.Role, request.RememberMe);

        user.LastLoginAt = DateTime.UtcNow;

        return await BuildAuthResponseAsync(user, request.RememberMe, ipAddress, userAgent, ct);
    }

    // ── Refresh ───────────────────────────────────────────────────────────────

    public async Task<AuthResponse> RefreshAsync(
        string refreshToken,
        string? ipAddress = null,
        string? userAgent = null,
        CancellationToken ct = default)
    {
        var tokenHash = HashToken(refreshToken);

        var storedToken = await _context.UserRefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash, ct);

        if (storedToken is null)
        {
            _logger.LogWarning("[Refresh] Token not found in DB.");
            throw new BoiootException("رمز التحديث غير صالح", 401);
        }

        if (storedToken.IsRevoked)
        {
            // Possible token reuse attack — revoke the entire family
            _logger.LogWarning(
                "[Refresh] Revoked token reuse attempt for user {UserId}. Revoking all tokens.",
                storedToken.UserId);
            await RevokeAllRefreshTokensAsync(storedToken.UserId, ipAddress, ct);
            throw new BoiootException("رمز التحديث مُلغى. يرجى تسجيل الدخول مجدداً", 401);
        }

        if (storedToken.IsExpired)
        {
            _logger.LogWarning("[Refresh] Expired refresh token for user {UserId}.", storedToken.UserId);
            throw new BoiootException("انتهت صلاحية رمز التحديث. يرجى تسجيل الدخول مجدداً", 401);
        }

        var user = storedToken.User;

        if (!user.IsActive)
            throw new BoiootException("الحساب غير مفعّل. يرجى التواصل مع الدعم", 403);

        // ── Rotation: determine the same rememberMe duration as the original ──
        // If original token lived > 1 day it was a rememberMe session.
        var wasRememberMe = (storedToken.ExpiresAtUtc - storedToken.CreatedAtUtc).TotalDays > 1;

        // Generate a new refresh token
        var (newRawToken, newTokenHash, newExpiresAt) = GenerateRefreshToken(wasRememberMe);

        // Revoke old token and link to replacement
        storedToken.RevokedAtUtc        = DateTime.UtcNow;
        storedToken.RevokedByIp         = ipAddress;
        storedToken.ReplacedByTokenHash = newTokenHash;

        // Persist new token
        var newStoredToken = new UserRefreshToken
        {
            UserId        = user.Id,
            TokenHash     = newTokenHash,
            CreatedAtUtc  = DateTime.UtcNow,
            ExpiresAtUtc  = newExpiresAt,
            CreatedByIp   = ipAddress,
            UserAgent     = userAgent,
        };

        _context.UserRefreshTokens.Add(newStoredToken);
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("[Refresh] Token rotated for user {UserId}.", user.Id);

        var permissions  = await ResolvePermissionsAsync(user, ct);
        var accessExpiry = DateTime.UtcNow.AddMinutes(GetAccessTokenExpiryMinutes());

        return new AuthResponse
        {
            Token                = GenerateToken(user, accessExpiry, permissions),
            ExpiresAt            = accessExpiry,
            RefreshToken         = newRawToken,
            RefreshTokenExpiresAt = newExpiresAt,
            User                 = MapToProfileResponse(user, permissions),
        };
    }

    // ── Logout (revoke single token) ──────────────────────────────────────────

    public async Task RevokeRefreshTokenAsync(
        string refreshToken,
        string? ipAddress = null,
        CancellationToken ct = default)
    {
        var tokenHash = HashToken(refreshToken);

        var storedToken = await _context.UserRefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash, ct);

        if (storedToken is null || storedToken.IsRevoked)
            return; // idempotent

        storedToken.RevokedAtUtc = DateTime.UtcNow;
        storedToken.RevokedByIp  = ipAddress;

        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("[Logout] Refresh token revoked for user {UserId}.", storedToken.UserId);
    }

    // ── Logout All (revoke all tokens for user) ───────────────────────────────

    public async Task RevokeAllRefreshTokensAsync(
        Guid userId,
        string? ipAddress = null,
        CancellationToken ct = default)
    {
        var now    = DateTime.UtcNow;
        var active = await _context.UserRefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAtUtc == null && t.ExpiresAtUtc > now)
            .ToListAsync(ct);

        foreach (var token in active)
        {
            token.RevokedAtUtc = now;
            token.RevokedByIp  = ipAddress;
        }

        if (active.Count > 0)
            await _context.SaveChangesAsync(ct);

        _logger.LogInformation("[LogoutAll] Revoked {Count} active token(s) for user {UserId}.", active.Count, userId);
    }

    // ── Session management (Phase 1B) ─────────────────────────────────────────

    public async Task<IReadOnlyList<SessionResponse>> GetSessionsAsync(
        Guid userId,
        string? currentTokenHash = null,
        CancellationToken ct = default)
    {
        var now     = DateTime.UtcNow;
        var records = await _context.UserRefreshTokens
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAtUtc)
            .ToListAsync(ct);

        return records.Select(t => new SessionResponse
        {
            Id           = t.Id,
            IsCurrent    = currentTokenHash != null && t.TokenHash == currentTokenHash,
            IsActive     = t.RevokedAtUtc == null && t.ExpiresAtUtc > now,
            CreatedAtUtc = t.CreatedAtUtc,
            ExpiresAtUtc = t.ExpiresAtUtc,
            RevokedAtUtc = t.RevokedAtUtc,
            CreatedByIp  = t.CreatedByIp,
            UserAgent    = t.UserAgent,
        }).ToList();
    }

    public async Task RevokeSessionByIdAsync(
        Guid sessionId,
        Guid userId,
        string? ipAddress = null,
        CancellationToken ct = default)
    {
        var token = await _context.UserRefreshTokens
            .FirstOrDefaultAsync(t => t.Id == sessionId && t.UserId == userId, ct);

        if (token is null)
            throw new BoiootException("الجلسة غير موجودة أو لا تخصك", 404);

        if (token.IsRevoked)
            return; // already revoked — idempotent

        token.RevokedAtUtc = DateTime.UtcNow;
        token.RevokedByIp  = ipAddress;
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("[Sessions] Session {SessionId} revoked by user {UserId}.", sessionId, userId);
    }

    public async Task RevokeOtherSessionsAsync(
        Guid userId,
        string? currentTokenHash,
        string? ipAddress = null,
        CancellationToken ct = default)
    {
        var now    = DateTime.UtcNow;
        var others = await _context.UserRefreshTokens
            .Where(t => t.UserId == userId
                        && t.RevokedAtUtc == null
                        && t.ExpiresAtUtc > now
                        && t.TokenHash != currentTokenHash)
            .ToListAsync(ct);

        foreach (var token in others)
        {
            token.RevokedAtUtc = now;
            token.RevokedByIp  = ipAddress;
        }

        if (others.Count > 0)
            await _context.SaveChangesAsync(ct);

        _logger.LogInformation("[Sessions] Revoked {Count} other session(s) for user {UserId}.", others.Count, userId);
    }

    // ── Profile ───────────────────────────────────────────────────────────────

    public async Task<UserProfileResponse> GetProfileAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new BoiootException("المستخدم غير موجود", 404);

        if (!user.IsActive)
            throw new BoiootException("الحساب غير مفعّل", 403);

        var permissions = await ResolvePermissionsAsync(user, ct);
        return MapToProfileResponse(user, permissions);
    }

    public async Task<UserProfileResponse> UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken ct = default)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new BoiootException("المستخدم غير موجود", 404);

        if (!user.IsActive)
            throw new BoiootException("الحساب غير مفعّل", 403);

        if (!string.IsNullOrWhiteSpace(request.NewPassword))
        {
            if (string.IsNullOrWhiteSpace(request.CurrentPassword))
                throw new BoiootException("يجب إدخال كلمة المرور الحالية لتغيير كلمة المرور", 400);

            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
                throw new BoiootException("كلمة المرور الحالية غير صحيحة", 400);

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        }

        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var normalizedEmail = request.Email.Trim().ToLowerInvariant();
            if (!normalizedEmail.Equals(user.Email, StringComparison.OrdinalIgnoreCase))
            {
                var emailTaken = await _context.Users
                    .AnyAsync(u => u.Email == normalizedEmail && u.Id != userId, ct);
                if (emailTaken)
                    throw new BoiootException("البريد الإلكتروني مستخدم من قِبل حساب آخر", 409);
                user.Email = normalizedEmail;
            }
        }

        user.FullName = request.FullName.Trim();
        user.Phone    = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();

        if (request.ProfileImageUrl != null)
            user.ProfileImageUrl = string.IsNullOrWhiteSpace(request.ProfileImageUrl) ? null : request.ProfileImageUrl;

        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("Profile updated for user: {UserId}", userId);

        var permissions = await ResolvePermissionsAsync(user, ct);
        return MapToProfileResponse(user, permissions);
    }

    // ── Change email (secure: password confirmation + uniqueness) ─────────────

    public async Task<UserProfileResponse> ChangeEmailAsync(Guid userId, ChangeEmailRequest request, CancellationToken ct = default)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new BoiootException("المستخدم غير موجود", 404);

        if (!user.IsActive)
            throw new BoiootException("الحساب غير مفعّل", 403);

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            throw new BoiootException("كلمة المرور الحالية غير صحيحة", 400);

        var normalizedEmail = request.NewEmail.Trim().ToLowerInvariant();

        if (normalizedEmail.Equals(user.Email, StringComparison.OrdinalIgnoreCase))
            throw new BoiootException("البريد الإلكتروني الجديد مطابق للبريد الحالي", 400);

        var emailTaken = await _context.Users
            .AnyAsync(u => u.Email == normalizedEmail && u.Id != userId, ct);
        if (emailTaken)
            throw new BoiootException("البريد الإلكتروني مستخدم من قِبل حساب آخر", 409);

        user.Email = normalizedEmail;
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("Email changed (secure flow) for user: {UserId}", userId);

        var permissions = await ResolvePermissionsAsync(user, ct);
        return MapToProfileResponse(user, permissions);
    }

    // ── Permission resolution ──────────────────────────────────────────────────

    private static readonly IReadOnlySet<UserRole> DbOnlyRoles =
        new HashSet<UserRole> { UserRole.Admin, UserRole.CompanyOwner };

    private async Task<IReadOnlyList<string>> ResolvePermissionsAsync(User user, CancellationToken ct)
    {
        var roleStr  = user.Role.ToString();
        var isDbOnly = DbOnlyRoles.Contains(user.Role);

        var dbPermissions = await _rbac.GetUserPermissionsAsync(user.Id, ct);

        if (isDbOnly)
        {
            _logger.LogInformation(
                "[RBAC] {Email} ({Role}) → DB ONLY ({Count} perms): [{Perms}]",
                user.Email, roleStr, dbPermissions.Count,
                string.Join(", ", dbPermissions));

            return dbPermissions;
        }

        var legacyPermissions = StaffRolePermissions.GetPermissions(roleStr);

        if (dbPermissions.Count == 0 && legacyPermissions.Count == 0)
            return Array.Empty<string>();

        if (dbPermissions.Count == 0)
        {
            _logger.LogInformation(
                "[RBAC] {Email} ({Role}) → fallback legacy ({LegacyCount} perms): [{Legacy}]",
                user.Email, roleStr, legacyPermissions.Count,
                string.Join(", ", legacyPermissions));

            return legacyPermissions;
        }

        var onlyInDb     = dbPermissions.Except(legacyPermissions).ToList();
        var onlyInLegacy = legacyPermissions.Except(dbPermissions).ToList();

        if (onlyInDb.Count != 0 || onlyInLegacy.Count != 0)
        {
            _logger.LogWarning(
                "[RBAC] {Email} ({Role}) → DB vs Legacy DIFF: only-in-DB=[{OnlyDb}] only-in-Legacy=[{OnlyLegacy}]",
                user.Email, roleStr,
                string.Join(", ", onlyInDb),
                string.Join(", ", onlyInLegacy));
        }

        _logger.LogInformation(
            "[RBAC] {Email} ({Role}) → DB ({Count} perms): [{Perms}]",
            user.Email, roleStr, dbPermissions.Count,
            string.Join(", ", dbPermissions));

        return dbPermissions;
    }

    // ── Auth response builder ──────────────────────────────────────────────────

    private async Task<AuthResponse> BuildAuthResponseAsync(
        User user,
        bool rememberMe,
        string? ipAddress,
        string? userAgent,
        CancellationToken ct)
    {
        var permissions  = await ResolvePermissionsAsync(user, ct);
        var accessExpiry = DateTime.UtcNow.AddMinutes(GetAccessTokenExpiryMinutes());

        var (rawRefreshToken, tokenHash, refreshExpiry) = GenerateRefreshToken(rememberMe);

        // Persist the refresh token
        var storedToken = new UserRefreshToken
        {
            UserId       = user.Id,
            TokenHash    = tokenHash,
            CreatedAtUtc = DateTime.UtcNow,
            ExpiresAtUtc = refreshExpiry,
            CreatedByIp  = ipAddress,
            UserAgent    = userAgent,
        };

        _context.UserRefreshTokens.Add(storedToken);
        await _context.SaveChangesAsync(ct);

        return new AuthResponse
        {
            Token                 = GenerateToken(user, accessExpiry, permissions),
            ExpiresAt             = accessExpiry,
            RefreshToken          = rawRefreshToken,
            RefreshTokenExpiresAt = refreshExpiry,
            User                  = MapToProfileResponse(user, permissions),
        };
    }

    // ── JWT generation ─────────────────────────────────────────────────────────

    private string GenerateToken(User user, DateTime expiresAt, IReadOnlyList<string> permissions)
    {
        var key         = _configuration["Jwt:Key"]!;
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var roleStr = user.Role.ToString();

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub,   user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Name,  user.FullName),
            new(ClaimTypes.Role,               roleStr),
            new(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString())
        };

        foreach (var perm in permissions)
            claims.Add(new Claim("permission", perm));

        var token = new JwtSecurityToken(
            issuer:             _configuration["Jwt:Issuer"] ?? "Boioot",
            audience:           _configuration["Jwt:Audience"] ?? "BoiootClient",
            claims:             claims,
            expires:            expiresAt,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    // ── Refresh token generation ───────────────────────────────────────────────

    private (string rawToken, string tokenHash, DateTime expiresAt) GenerateRefreshToken(bool rememberMe)
    {
        // 64 cryptographically random bytes → base64url encoded opaque token
        var randomBytes = RandomNumberGenerator.GetBytes(64);
        var rawToken    = Convert.ToBase64String(randomBytes);

        var expiryDays = rememberMe
            ? GetRefreshTokenRememberMeExpiryDays()
            : GetRefreshTokenExpiryDays();

        var expiresAt = DateTime.UtcNow.AddDays(expiryDays);

        return (rawToken, HashToken(rawToken), expiresAt);
    }

    // ── Hashing ───────────────────────────────────────────────────────────────

    private static string HashToken(string token)
    {
        var bytes = Encoding.UTF8.GetBytes(token);
        var hash  = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<string> GenerateUserCodeAsync(UserRole role, CancellationToken ct)
    {
        var prefix = role switch
        {
            UserRole.Owner        => "OWN",
            UserRole.Broker       => "BRK",
            UserRole.Office       => "OFF",
            UserRole.Agent        => "AGT",
            UserRole.CompanyOwner => "CO",
            UserRole.Admin        => "ADM",
            _                     => "U",
        };

        var count = await _context.Users
            .IgnoreQueryFilters()
            .CountAsync(u => u.Role == role, ct);

        var candidate = count + 1;
        string code;
        do
        {
            code = $"{prefix}-{candidate:D4}";
            var exists = await _context.Users
                .IgnoreQueryFilters()
                .AnyAsync(u => u.UserCode == code, ct);
            if (!exists) break;
            candidate++;
        } while (true);

        return code;
    }

    private int GetAccessTokenExpiryMinutes() =>
        int.TryParse(_configuration["Jwt:AccessTokenExpiryMinutes"], out var mins) ? mins : 15;

    private int GetRefreshTokenExpiryDays() =>
        int.TryParse(_configuration["Jwt:RefreshTokenExpiryDays"], out var days) ? days : 1;

    private int GetRefreshTokenRememberMeExpiryDays() =>
        int.TryParse(_configuration["Jwt:RefreshTokenRememberMeExpiryDays"], out var days) ? days : 30;

    private static UserProfileResponse MapToProfileResponse(User user, IReadOnlyList<string> permissions)
    {
        return new UserProfileResponse
        {
            Id              = user.Id,
            UserCode        = user.UserCode,
            FullName        = user.FullName,
            Email           = user.Email,
            Phone           = user.Phone,
            Role            = user.Role.ToString(),
            ProfileImageUrl = user.ProfileImageUrl,
            CreatedAt       = user.CreatedAt,
            Permissions     = permissions,
        };
    }
}
