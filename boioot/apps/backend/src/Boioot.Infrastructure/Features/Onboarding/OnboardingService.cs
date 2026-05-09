using Boioot.Application.Exceptions;
using Boioot.Application.Features.Onboarding.DTOs;
using Boioot.Application.Features.Onboarding.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Infrastructure.Features.Onboarding;

/// <summary>
/// Handles business / professional profile completion for commercial accounts.
///
/// Two distinct paths:
///   1. Broker  — individual professional. On first save, a solo Company (CompanyType="Broker")
///      and Agent record are auto-created so the same profile API can be reused.
///      GET returns a scaffold pre-filled from User data if no Company exists yet.
///
///   2. CompanyOwner — office or developer company. Company + Agent already exist
///      (created during registration). Read/write directly on that Company record.
///
/// Agent accounts are not directed to onboarding (frontend guard).
/// </summary>
public class OnboardingService : IOnboardingService
{
    private readonly BoiootDbContext _context;

    public OnboardingService(BoiootDbContext context)
    {
        _context = context;
    }

    // ── Get ───────────────────────────────────────────────────────────────────

    public async Task<BusinessProfileResponse> GetBusinessProfileAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await RequireUserAsync(userId, ct);

        if (user.Role == UserRole.Broker)
            return await GetBrokerProfileAsync(user, ct);

        var company = await ResolveCompanyAsync(userId, ct);
        return MapToResponse(company);
    }

    // ── Update ────────────────────────────────────────────────────────────────

    public async Task<BusinessProfileResponse> UpdateBusinessProfileAsync(
        Guid userId,
        UpdateBusinessProfileRequest request,
        CancellationToken ct = default)
    {
        var user = await RequireUserAsync(userId, ct);

        Company company;
        if (user.Role == UserRole.Broker)
        {
            // UpdateBrokerProfileAsync saves company data internally.
            // We then sync those fields to AgencyProfile and save again.
            var response = await UpdateBrokerProfileAsync(user, request, ct);
            company = await _context.Agents
                .Include(a => a.Company)
                .Where(a => a.UserId == userId)
                .Select(a => a.Company!)
                .FirstAsync(ct);
            await SyncAgencyProfileAsync(userId, company, ct);
            await _context.SaveChangesAsync(ct);
            return response;
        }

        company = await ResolveCompanyAsync(userId, ct);
        ApplyUpdate(company, request);
        company.IsProfileComplete = true;
        await SyncAgencyProfileAsync(userId, company, ct);
        await _context.SaveChangesAsync(ct);
        return MapToResponse(company);
    }

    // ── Broker-specific helpers ───────────────────────────────────────────────

    /// <summary>
    /// Returns the broker's professional profile.
    /// If no Company exists yet (first visit), returns a scaffold pre-filled from User data.
    /// Never throws 404 for a valid Broker account.
    /// </summary>
    private async Task<BusinessProfileResponse> GetBrokerProfileAsync(User user, CancellationToken ct)
    {
        var agent = await _context.Agents
            .AsNoTracking()
            .Include(a => a.Company)
            .FirstOrDefaultAsync(a => a.UserId == user.Id, ct);

        if (agent?.Company is not null)
            return MapToResponse(agent.Company);

        // No company yet — return scaffold from user registration data
        return new BusinessProfileResponse
        {
            CompanyId         = Guid.Empty,
            DisplayName       = user.FullName,
            Phone             = user.Phone,
            IsProfileComplete = false,
            IsVerified        = false,
        };
    }

    /// <summary>
    /// Saves the broker's professional profile.
    /// On first call (no Company/Agent), auto-creates a solo Company (CompanyType="Broker")
    /// and an Agent record so subsequent reads/writes use the same Company path.
    /// </summary>
    private async Task<BusinessProfileResponse> UpdateBrokerProfileAsync(
        User user,
        UpdateBusinessProfileRequest request,
        CancellationToken ct)
    {
        var agent = await _context.Agents
            .Include(a => a.Company)
            .FirstOrDefaultAsync(a => a.UserId == user.Id, ct);

        Company company;

        if (agent?.Company is not null)
        {
            company = agent.Company;
        }
        else
        {
            // First save — auto-create solo profile for broker
            company = new Company
            {
                Name        = request.DisplayName.Trim(),
                Email       = user.Email,
                Phone       = string.IsNullOrWhiteSpace(request.Phone) ? user.Phone : request.Phone.Trim(),
                CompanyType = "Broker",
            };
            _context.Companies.Add(company);

            if (agent is null)
            {
                _context.Agents.Add(new Agent { UserId = user.Id, Company = company });
            }
            else
            {
                // Agent exists but has no Company — link it
                agent.Company = company;
            }
        }

        ApplyUpdate(company, request);
        company.IsProfileComplete = true;

        await _context.SaveChangesAsync(ct);
        return MapToResponse(company);
    }

    // ── CompanyOwner helpers ──────────────────────────────────────────────────

    /// <summary>
    /// Resolves the Company for CompanyOwner accounts.
    /// Throws 404 if no Agent/Company is found (should not happen for valid registrations).
    /// </summary>
    private async Task<Company> ResolveCompanyAsync(Guid userId, CancellationToken ct)
    {
        var agent = await _context.Agents
            .Include(a => a.Company)
            .FirstOrDefaultAsync(a => a.UserId == userId, ct);

        if (agent?.Company is null)
            throw new BoiootException("لم يتم العثور على الملف التجاري لهذا الحساب", 404);

        return agent.Company;
    }

    // ── AgencyProfile sync ────────────────────────────────────────────────────

    /// <summary>
    /// After onboarding saves company/broker profile data, mirror key fields to AgencyProfile
    /// so the user appears in the public /agencies listing with correct city/bio/province data.
    /// IsVisible is set to true ONLY when creating a new profile — admin can still hide it afterwards.
    /// </summary>
    private async Task SyncAgencyProfileAsync(Guid userId, Company company, CancellationToken ct)
    {
        var userIdStr = userId.ToString();
        var profile   = await _context.AgencyProfiles.FindAsync(new object[] { userIdStr }, ct);

        if (profile is null)
        {
            profile = new AgencyProfile
            {
                UserId     = userIdStr,
                IsVisible  = true,
                IsFeatured = false,
                SortOrder  = 0,
            };
            _context.AgencyProfiles.Add(profile);
        }

        profile.Bio           = company.Description;
        profile.City          = company.City;
        profile.Province      = company.Province;
        profile.ContactNumber = company.Phone;
        profile.WhatsappLink  = company.WhatsApp;
        profile.Address       = company.Address;
        profile.UpdatedAt     = DateTime.UtcNow;
    }

    // ── Shared helpers ────────────────────────────────────────────────────────

    private async Task<User> RequireUserAsync(Guid userId, CancellationToken ct)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted, ct);

        if (user is null)
            throw new BoiootException("المستخدم غير موجود", 404);

        return user;
    }

    private static void ApplyUpdate(Company company, UpdateBusinessProfileRequest r)
    {
        company.Name         = r.DisplayName.Trim();
        company.Province     = string.IsNullOrWhiteSpace(r.Province)     ? null : r.Province.Trim();
        company.City         = string.IsNullOrWhiteSpace(r.City)         ? null : r.City.Trim();
        company.Neighborhood = string.IsNullOrWhiteSpace(r.Neighborhood) ? null : r.Neighborhood.Trim();
        company.Address      = string.IsNullOrWhiteSpace(r.Address)      ? null : r.Address.Trim();
        company.Phone        = string.IsNullOrWhiteSpace(r.Phone)        ? null : r.Phone.Trim();
        company.WhatsApp     = string.IsNullOrWhiteSpace(r.WhatsApp)     ? null : r.WhatsApp.Trim();
        company.Description  = string.IsNullOrWhiteSpace(r.Description)  ? null : r.Description.Trim();
        company.Latitude       = r.Latitude;
        company.Longitude      = r.Longitude;
        company.CityId         = r.CityId;
        company.NeighborhoodId = r.NeighborhoodId;
    }

    private static BusinessProfileResponse MapToResponse(Company c) =>
        new()
        {
            CompanyId         = c.Id,
            DisplayName       = c.Name,
            Province          = c.Province,
            City              = c.City,
            Neighborhood      = c.Neighborhood,
            CityId            = c.CityId,
            NeighborhoodId    = c.NeighborhoodId,
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
