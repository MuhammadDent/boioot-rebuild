namespace Boioot.Application.Features.Onboarding.DTOs;

public class BusinessProfileResponse
{
    public Guid CompanyId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? Province { get; set; }
    public string? City { get; set; }
    public string? Neighborhood { get; set; }
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? WhatsApp { get; set; }
    public string? Description { get; set; }
    public string? LogoUrl { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public bool IsProfileComplete { get; set; }
    public bool IsVerified { get; set; }
}
