namespace Boioot.Domain.Entities;

public class BuyerRequestComment : BaseEntity
{
    public string Content { get; set; } = string.Empty;

    public Guid BuyerRequestId { get; set; }
    public BuyerRequest? BuyerRequest { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    // ── Threaded replies ──────────────────────────────────────────────────────
    /// <summary>
    /// Null = top-level comment.
    /// Non-null = reply to another comment in the same request.
    /// </summary>
    public Guid? ParentCommentId { get; set; }
    public BuyerRequestComment? ParentComment { get; set; }
    public ICollection<BuyerRequestComment> Replies { get; set; } = new List<BuyerRequestComment>();
}
