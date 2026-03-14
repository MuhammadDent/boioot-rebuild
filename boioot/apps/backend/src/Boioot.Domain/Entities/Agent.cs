namespace Boioot.Domain.Entities;

public class Agent : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid? CompanyId { get; set; }
    public string? Bio { get; set; }

    public User User { get; set; } = null!;
    public Company? Company { get; set; }
    public ICollection<Property> Properties { get; set; } = [];
}
