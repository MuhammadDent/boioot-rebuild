using Boioot.Domain.Common;

namespace Boioot.Domain.Entities;

public class Agent : AuditableEntity
{
    public string? BioAr { get; set; }
    public string? BioEn { get; set; }
    public string? LicenseNumber { get; set; }
    public int YearsOfExperience { get; set; } = 0;
    public string? Specializations { get; set; }
    public bool IsVerified { get; set; } = false;
    public bool IsActive { get; set; } = true;
    public double AverageRating { get; set; } = 0;
    public int ReviewCount { get; set; } = 0;
    public int PropertiesCount { get; set; } = 0;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid? CompanyId { get; set; }
    public Company? Company { get; set; }

    public ICollection<Property> Properties { get; set; } = [];
    public ICollection<Review> Reviews { get; set; } = [];
}
