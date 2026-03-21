using Boioot.Application.Exceptions;
using Boioot.Application.Features.Onboarding.DTOs;
using Boioot.Application.Features.Onboarding.Interfaces;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Infrastructure.Features.Onboarding;

public class OnboardingService : IOnboardingService
{
    private readonly BoiootDbContext _context;

    public OnboardingService(BoiootDbContext context)
    {
        _context = context;
    }

    public async Task<BusinessProfileResponse> GetBusinessProfileAsync(Guid userId, CancellationToken ct = default)
    {
        var company = await ResolveCompanyAsync(userId, ct);
        return MapToResponse(company);
    }

    public async Task<BusinessProfileResponse> UpdateBusinessProfileAsync(
        Guid userId,
        UpdateBusinessProfileRequest request,
        CancellationToken ct = default)
    {
        var company = await ResolveCompanyAsync(userId, ct);

        company.Name          = request.DisplayName.Trim();
        company.City          = request.City.Trim();
        company.Neighborhood  = string.IsNullOrWhiteSpace(request.Neighborhood) ? null : request.Neighborhood.Trim();
        company.Address       = string.IsNullOrWhiteSpace(request.Address)      ? null : request.Address.Trim();
        company.Phone         = string.IsNullOrWhiteSpace(request.Phone)        ? null : request.Phone.Trim();
        company.WhatsApp      = string.IsNullOrWhiteSpace(request.WhatsApp)     ? null : request.WhatsApp.Trim();
        company.Description   = string.IsNullOrWhiteSpace(request.Description)  ? null : request.Description.Trim();
        company.Latitude      = request.Latitude;
        company.Longitude     = request.Longitude;
        company.IsProfileComplete = true;

        await _context.SaveChangesAsync(ct);

        return MapToResponse(company);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<Domain.Entities.Company> ResolveCompanyAsync(Guid userId, CancellationToken ct)
    {
        var agent = await _context.Agents
            .Include(a => a.Company)
            .FirstOrDefaultAsync(a => a.UserId == userId, ct);

        if (agent?.Company is null)
            throw new BoiootException("لم يتم العثور على الملف التجاري لهذا الحساب", 404);

        return agent.Company;
    }

    private static BusinessProfileResponse MapToResponse(Domain.Entities.Company c) =>
        new()
        {
            CompanyId         = c.Id,
            DisplayName       = c.Name,
            City              = c.City,
            Neighborhood      = c.Neighborhood,
            Address           = c.Address,
            Phone             = c.Phone,
            WhatsApp          = c.WhatsApp,
            Description       = c.Description,
            LogoUrl           = c.LogoUrl,
            Latitude          = c.Latitude,
            Longitude         = c.Longitude,
            IsProfileComplete = c.IsProfileComplete,
            IsVerified        = c.IsVerified,
        };
}
