namespace Boioot.Domain.Entities;

/// <summary>Admin-managed dropdown options for the Special Requests form.</summary>
public class SpecialRequestType : BaseEntity
{
    /// <summary>Arabic label shown to the public user in the dropdown.</summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>Internal value stored on the SpecialRequest record.</summary>
    public string Value { get; set; } = string.Empty;

    /// <summary>Display order (ascending).</summary>
    public int SortOrder { get; set; }

    /// <summary>Whether this option appears in the public form.</summary>
    public bool IsActive { get; set; } = true;
}
