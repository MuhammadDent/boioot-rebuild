using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Coverage.DTOs;

public class AddCoverageDto
{
    /// <summary>Required for city_wide and custom. Null for province_wide.</summary>
    public Guid? CityId { get; set; }

    /// <summary>Required for province_wide (e.g. "درعا"). Null for city_wide / custom.</summary>
    public string? Province { get; set; }

    /// <summary>Required when CoverageType = "custom".</summary>
    public Guid? NeighborhoodId { get; set; }

    /// <summary>"city_wide" | "custom" | "province_wide"</summary>
    [Required]
    [RegularExpression("^(city_wide|custom|province_wide)$",
        ErrorMessage = "CoverageType يجب أن يكون city_wide أو custom أو province_wide")]
    public string CoverageType { get; set; } = "city_wide";
}
