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
using Microsoft.IdentityModel.Tokens;

namespace Boioot.Infrastructure.Features.Auth;

public class AuthService : IAuthService
{
    private readonly BoiootDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthService(BoiootDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        var emailLower = request.Email.ToLowerInvariant();

        var emailExists = await _context.Users
            .AnyAsync(u => u.Email == emailLower);

        if (emailExists)
            throw new BoiootException("البريد الإلكتروني مستخدم بالفعل", 409);

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = emailLower,
            Phone = request.Phone?.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = UserRole.User,
            IsActive = true
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return BuildAuthResponse(user);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var emailLower = request.Email.ToLowerInvariant();

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == emailLower);

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new BoiootException("بيانات الدخول غير صحيحة", 401);

        if (!user.IsActive)
            throw new BoiootException("الحساب غير مفعّل. يرجى التواصل مع الدعم", 403);

        return BuildAuthResponse(user);
    }

    public async Task<UserProfileResponse> GetProfileAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId)
            ?? throw new BoiootException("المستخدم غير موجود", 404);

        return MapToProfileResponse(user);
    }

    private AuthResponse BuildAuthResponse(User user)
    {
        var expiryMinutes = GetExpiryMinutes();
        return new AuthResponse
        {
            Token = GenerateToken(user),
            ExpiresInMinutes = expiryMinutes,
            User = MapToProfileResponse(user)
        };
    }

    private int GetExpiryMinutes() =>
        int.TryParse(_configuration["Jwt:ExpiryMinutes"], out var mins) ? mins : 1440;

    private string GenerateToken(User user)
    {
        var key = _configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("مفتاح JWT غير مضبوط في الإعدادات");

        if (Encoding.UTF8.GetByteCount(key) < 32)
            throw new InvalidOperationException("مفتاح JWT يجب أن لا يقل طوله عن 32 بايت");

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);
        var expiryMinutes = GetExpiryMinutes();

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
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static UserProfileResponse MapToProfileResponse(User user) => new()
    {
        Id = user.Id,
        FullName = user.FullName,
        Email = user.Email,
        Phone = user.Phone,
        Role = user.Role.ToString(),
        CreatedAt = user.CreatedAt
    };
}
