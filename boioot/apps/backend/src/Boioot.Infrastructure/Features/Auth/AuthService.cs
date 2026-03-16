using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Boioot.Application.Exceptions;
using Boioot.Application.Features.Auth.DTOs;
using Boioot.Application.Features.Auth.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Domain.Enums;
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

    public AuthService(
        BoiootDbContext context,
        IConfiguration configuration,
        ILogger<AuthService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
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
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("New user registered: {Email} | Role: {Role}", emailLower, user.Role);

        return BuildAuthResponse(user);
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

        return BuildAuthResponse(user);
    }

    public async Task<UserProfileResponse> GetProfileAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new BoiootException("المستخدم غير موجود", 404);

        if (!user.IsActive)
            throw new BoiootException("الحساب غير مفعّل", 403);

        return MapToProfileResponse(user);
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

        return MapToProfileResponse(user);
    }

    private AuthResponse BuildAuthResponse(User user)
    {
        var expiryMinutes = GetExpiryMinutes();
        var expiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes);

        return new AuthResponse
        {
            Token = GenerateToken(user, expiresAt),
            ExpiresAt = expiresAt,
            User = MapToProfileResponse(user)
        };
    }

    private string GenerateToken(User user, DateTime expiresAt)
    {
        var key = _configuration["Jwt:Key"]!;
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Name, user.FullName),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"] ?? "Boioot",
            audience: _configuration["Jwt:Audience"] ?? "BoiootClient",
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private async Task<string> GenerateUserCodeAsync(UserRole role, CancellationToken ct)
    {
        var prefix = role switch
        {
            UserRole.Agent        => "A",
            UserRole.CompanyOwner => "C",
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

    private static UserProfileResponse MapToProfileResponse(User user) => new()
    {
        Id = user.Id,
        UserCode = user.UserCode,
        FullName = user.FullName,
        Email = user.Email,
        Phone = user.Phone,
        Role = user.Role.ToString(),
        ProfileImageUrl = user.ProfileImageUrl,
        CreatedAt = user.CreatedAt
    };
}
