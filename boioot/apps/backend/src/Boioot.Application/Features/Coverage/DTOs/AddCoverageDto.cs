using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Coverage.DTOs;

public class AddCoverageDto
{
    [Required]
    public Guid CityId { get; set; }

    /// <summary>Required when CoverageType = "custom".</summary>
    public Guid? NeighborhoodId { get; set; }

    /// <summary>"city_wide" | "custom"</summary>
    [Required]
    [RegularExpression("^(city_wide|custom)$",
        ErrorMessage = "CoverageType يجب أن يكون city_wide أو custom")]
    public string CoverageType { get; set; } = "city_wide";
}
