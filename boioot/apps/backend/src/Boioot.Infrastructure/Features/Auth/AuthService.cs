using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
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

        // ── Auto-create Company + Agent for business accounts ─────────────────
        // CompanyOwner = شركة تطوير  |  Broker = مكتب عقاري
        // Everything is added to the EF change tracker before SaveChanges so
        // all three records (User, Company, Agent) are written atomically.
        if (role is UserRole.CompanyOwner or UserRole.Broker)
        {
            var companyName = string.IsNullOrWhiteSpace(request.CompanyName)
                ? request.FullName.Trim()
                : request.CompanyName.Trim();

            var company = new Company
            {
                Name  = companyName,
                Email = emailLower,
                Phone = request.Phone?.Trim(),
            };

            _context.Companies.Add(company);

            var agent = new Agent
            {
                User    = user,
                Company = company,
            };

            _context.Agents.Add(agent);

            _logger.LogInformation(
                "Auto-created Company '{CompanyName}' and Agent for {Email} ({Role})",
                companyName, emailLower, role);
        }

        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("New user registered: {Email} | Role: {Role}", emailLower, user.Role);

        return await BuildAuthResponseAsync(user, ct);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
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

        _logger.LogInformation("User logged in: {Email} | Role: {Role}", emailLower, user.Role);

        return await BuildAuthResponseAsync(user, ct);
    }

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

        // ── Password verification (required for email change) ─────────────────
        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            throw new BoiootException("كلمة المرور الحالية غير صحيحة", 400);

        var normalizedEmail = request.NewEmail.Trim().ToLowerInvariant();

        // ── Reject if same as current ─────────────────────────────────────────
        if (normalizedEmail.Equals(user.Email, StringComparison.OrdinalIgnoreCase))
            throw new BoiootException("البريد الإلكتروني الجديد مطابق للبريد الحالي", 400);

        // ── Uniqueness check ──────────────────────────────────────────────────
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

    // ── Permission resolution — Phase 3 (Selective DB Mode) ──────────────────
    //
    // Admin + CompanyOwner → DB ONLY. No fallback to legacy. Source of truth = DB rows.
    // All other roles → DB first, fallback to legacy if no DB rows found.

    private static readonly IReadOnlySet<UserRole> DbOnlyRoles =
        new HashSet<UserRole> { UserRole.Admin, UserRole.CompanyOwner };

    private async Task<IReadOnlyList<string>> ResolvePermissionsAsync(User user, CancellationToken ct)
    {
        var roleStr  = user.Role.ToString();
        var isDbOnly = DbOnlyRoles.Contains(user.Role);

        // Pass 1 — DB-driven permissions (always queried)
        var dbPermissions = await _rbac.GetUserPermissionsAsync(user.Id, ct);

        // ── Admin + CompanyOwner: DB ONLY — no legacy fallback ───────────────
        if (isDbOnly)
        {
            _logger.LogInformation(
                "[RBAC] {Email} ({Role}) → DB ONLY ({Count} perms): [{Perms}]",
                user.Email, roleStr, dbPermissions.Count,
                string.Join(", ", dbPermissions));

            return dbPermissions;
        }

        // ── All other roles: DB first, legacy fallback ────────────────────────
        var legacyPermissions = StaffRolePermissions.GetPermissions(roleStr);

        if (dbPermissions.Count == 0 && legacyPermissions.Count == 0)
        {
            _logger.LogDebug(
                "[RBAC] {Email} ({Role}) → fallback legacy — DB: none, Legacy: none → no permissions",
                user.Email, roleStr);

            return Array.Empty<string>();
        }

        if (dbPermissions.Count == 0)
        {
            _logger.LogInformation(
                "[RBAC] {Email} ({Role}) → fallback legacy ({LegacyCount} perms): [{Legacy}]",
                user.Email, roleStr, legacyPermissions.Count,
                string.Join(", ", legacyPermissions));

            return legacyPermissions;
        }

        // DB has rows — log comparison and use DB
        var onlyInDb     = dbPermissions.Except(legacyPermissions).ToList();
        var onlyInLegacy = legacyPermissions.Except(dbPermissions).ToList();

        if (onlyInDb.Count == 0 && onlyInLegacy.Count == 0)
        {
            _logger.LogInformation(
                "[RBAC] {Email} ({Role}) → DB ({DbCount}) == Legacy ({LegacyCount}) ✓ identical",
                user.Email, roleStr, dbPermissions.Count, legacyPermissions.Count);
        }
        else
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

    private async Task<AuthResponse> BuildAuthResponseAsync(User user, CancellationToken ct)
    {
        var expiryMinutes = GetExpiryMinutes();
        var expiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes);
        var permissions = await ResolvePermissionsAsync(user, ct);

        return new AuthResponse
        {
            Token = GenerateToken(user, expiresAt, permissions),
            ExpiresAt = expiresAt,
            User = MapToProfileResponse(user, permissions)
        };
    }

    // ── JWT generation ─────────────────────────────────────────────────────────

    private string GenerateToken(User user, DateTime expiresAt, IReadOnlyList<string> permissions)
    {
        var key = _configuration["Jwt:Key"]!;
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var roleStr = user.Role.ToString();

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Name, user.FullName),
            new(ClaimTypes.Role, roleStr),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        // Embed resolved permissions as individual claims.
        // PermissionAuthorizationHandler reads these on every request — no DB hit per request.
        foreach (var perm in permissions)
            claims.Add(new Claim("permission", perm));

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"] ?? "Boioot",
            audience: _configuration["Jwt:Audience"] ?? "BoiootClient",
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<string> GenerateUserCodeAsync(UserRole role, CancellationToken ct)
    {
        var prefix = role switch
        {
            UserRole.Owner        => "OWN",
            UserRole.Broker       => "BRK",
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

    private int GetExpiryMinutes() =>
        int.TryParse(_configuration["Jwt:ExpiryMinutes"], out var mins) ? mins : 1440;

    private static UserProfileResponse MapToProfileResponse(User user, IReadOnlyList<string> permissions)
    {
        var roleStr = user.Role.ToString();
        return new UserProfileResponse
        {
            Id              = user.Id,
            UserCode        = user.UserCode,
            FullName        = user.FullName,
            Email           = user.Email,
            Phone           = user.Phone,
            Role            = roleStr,
            ProfileImageUrl = user.ProfileImageUrl,
            CreatedAt       = user.CreatedAt,
            Permissions     = permissions,
        };
    }
}
