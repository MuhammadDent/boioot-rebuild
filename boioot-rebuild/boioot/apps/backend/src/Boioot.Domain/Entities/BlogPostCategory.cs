namespace Boioot.Domain.Entities;

public class BlogPostCategory
{
    public Guid BlogPostId { get; set; }
    public Guid BlogCategoryId { get; set; }

    public BlogPost BlogPost { get; set; } = null!;
    public BlogCategory BlogCategory { get; set; } = null!;
}
