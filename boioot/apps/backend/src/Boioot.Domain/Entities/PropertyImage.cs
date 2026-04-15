namespace Boioot.Domain.Entities;

public class PropertyImage : BaseEntity
{
    public Guid PropertyId { get; set; }
    public string ImageUrl { get; set; } = string.Empty;

    /// <summary>
    /// Legacy field — kept for backward compatibility with existing code.
    /// New code should use <see cref="IsCover"/> instead.
    /// </summary>
    public bool IsPrimary { get; set; } = false;

    /// <summary>
    /// Whether this image is the cover (main display image) for the property.
    /// Only one PropertyImage per Property should have IsCover = true.
    /// Enforced by ImagesController.SetCover.
    /// </summary>
    public bool IsCover { get; set; } = false;

    public int Order { get; set; } = 0;

    /// <summary>
    /// Optional FK to the UserImage that was uploaded via the upload API.
    /// Null for images added via URL (legacy) or admin tools.
    /// </summary>
    public Guid? UserImageId { get; set; }

    public Property Property { get; set; } = null!;
    public UserImage? UserImage { get; set; }
}
