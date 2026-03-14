using System.ComponentModel.DataAnnotations;
using Boioot.Domain.Enums;

namespace Boioot.Application.Features.Projects.DTOs;

public class UpdateProjectRequest
{
    [Required(ErrorMessage = "اسم المشروع مطلوب")]
    [MinLength(2, ErrorMessage = "اسم المشروع يجب أن لا يقل عن حرفين")]
    [MaxLength(300, ErrorMessage = "اسم المشروع يجب أن لا يتجاوز 300 حرف")]
    public string Title { get; set; } = string.Empty;

    [MaxLength(3000, ErrorMessage = "الوصف يجب أن لا يتجاوز 3000 حرف")]
    public string? Description { get; set; }

    [Required(ErrorMessage = "المدينة مطلوبة")]
    [MaxLength(100, ErrorMessage = "اسم المدينة يجب أن لا يتجاوز 100 حرف")]
    public string City { get; set; } = string.Empty;

    [MaxLength(300, ErrorMessage = "العنوان التفصيلي يجب أن لا يتجاوز 300 حرف")]
    public string? Address { get; set; }

    [Range(-90.0, 90.0, ErrorMessage = "خط العرض يجب أن يكون بين -90 و 90")]
    public double? Latitude { get; set; }

    [Range(-180.0, 180.0, ErrorMessage = "خط الطول يجب أن يكون بين -180 و 180")]
    public double? Longitude { get; set; }

    [Range(0, 9_999_999_999, ErrorMessage = "السعر الابتدائي يجب أن يكون رقماً موجباً")]
    public decimal? StartingPrice { get; set; }

    public DateTime? DeliveryDate { get; set; }

    [Required(ErrorMessage = "حالة المشروع مطلوبة")]
    public ProjectStatus? Status { get; set; }

    public bool IsPublished { get; set; }
}
