using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Admin.DTOs;

public class UpsertOwnershipTypeRequest
{
    [Required(ErrorMessage = "القيمة الداخلية مطلوبة")]
    [MaxLength(100)]
    public string Value { get; set; } = string.Empty;

    [Required(ErrorMessage = "الاسم المعروض مطلوب")]
    [MaxLength(200)]
    public string Label { get; set; } = string.Empty;

    public int Order { get; set; }
    public bool IsActive { get; set; } = true;
}
