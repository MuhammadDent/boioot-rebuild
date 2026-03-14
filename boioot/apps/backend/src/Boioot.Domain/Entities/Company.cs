namespace Boioot.Domain.Entities;

public class Company : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public string? Description { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public bool IsVerified { get; set; } = false;
    public bool IsDeleted { get; set; } = false;

    public ICollection<Agent> Agents { get; set; } = [];
    public ICollection<Property> Properties { get; set; } = [];
    public ICollection<Project> Projects { get; set; } = [];
}
