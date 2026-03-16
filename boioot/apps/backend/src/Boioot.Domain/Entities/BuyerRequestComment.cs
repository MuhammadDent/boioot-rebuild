namespace Boioot.Domain.Entities;

public class BuyerRequestComment : BaseEntity
{
    public string Content { get; set; } = string.Empty;

    public Guid BuyerRequestId { get; set; }
    public BuyerRequest? BuyerRequest { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }
}
