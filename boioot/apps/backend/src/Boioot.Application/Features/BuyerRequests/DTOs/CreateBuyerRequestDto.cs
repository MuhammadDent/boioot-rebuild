using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.BuyerRequests.DTOs;

public class CreateBuyerRequestDto
{
    [Required(ErrorMessage = "عنوان الطلب مطلوب")]
    [MinLength(3, ErrorMessage = "العنوان يجب أن لا يقل عن 3 أحرف")]
    [MaxLength(300, ErrorMessage = "العنوان يجب أن لا يتجاوز 300 حرف")]
    public string Title { get; set; } = string.Empty;

    [Required(ErrorMessage = "فئة العقار مطلوبة")]
    public string PropertyType { get; set; } = string.Empty;

    [Required(ErrorMessage = "وصف الطلب مطلوب")]
    [MinLength(10, ErrorMessage = "الوصف يجب أن لا يقل عن 10 أحرف")]
    [MaxLength(3000, ErrorMessage = "الوصف يجب أن لا يتجاوز 3000 حرف")]
    public string Description { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? City { get; set; }

    [MaxLength(200)]
    public string? Neighborhood { get; set; }
}
