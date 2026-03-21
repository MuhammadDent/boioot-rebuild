using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Onboarding.DTOs;

public class UpdateBusinessProfileRequest
{
    [Required(ErrorMessage = "الاسم التجاري مطلوب")]
    [MaxLength(200, ErrorMessage = "الاسم التجاري لا يتجاوز 200 حرف")]
    public string DisplayName { get; set; } = string.Empty;

    [Required(ErrorMessage = "المدينة مطلوبة")]
    [MaxLength(100, ErrorMessage = "اسم المدينة لا يتجاوز 100 حرف")]
    public string City { get; set; } = string.Empty;

    [MaxLength(150, ErrorMessage = "الحي/المنطقة لا تتجاوز 150 حرف")]
    public string? Neighborhood { get; set; }

    [MaxLength(300, ErrorMessage = "العنوان لا يتجاوز 300 حرف")]
    public string? Address { get; set; }

    [MaxLength(30, ErrorMessage = "رقم الهاتف لا يتجاوز 30 رقماً")]
    public string? Phone { get; set; }

    [MaxLength(30, ErrorMessage = "رقم واتساب لا يتجاوز 30 رقماً")]
    public string? WhatsApp { get; set; }

    [MaxLength(2000, ErrorMessage = "الوصف لا يتجاوز 2000 حرف")]
    public string? Description { get; set; }

    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
}
