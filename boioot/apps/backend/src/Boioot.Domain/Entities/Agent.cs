namespace Boioot.Domain.Entities;

public class Agent : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid? CompanyId { get; set; }
    /// <summary>
    /// معرّف المكتب العقاري (Broker) الذي أنشأ هذا الوكيل — فارغ إذا أنشأته شركة
    /// </summary>
    public Guid? BrokerId { get; set; }
    public string? Bio { get; set; }

    public User User { get; set; } = null!;
    public Company? Company { get; set; }
    public ICollection<Property> Properties { get; set; } = [];
}
