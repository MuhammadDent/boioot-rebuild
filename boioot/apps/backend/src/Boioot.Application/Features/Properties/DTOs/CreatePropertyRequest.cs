using System.ComponentModel.DataAnnotations;
using Boioot.Domain.Enums;

namespace Boioot.Application.Features.Properties.DTOs;

public class CreatePropertyRequest
{
    [Required(ErrorMessage = "عنوان العقار مطلوب")]
    [MinLength(2, ErrorMessage = "العنوان يجب أن لا يقل عن حرفين")]
    [MaxLength(300, ErrorMessage = "العنوان يجب أن لا يتجاوز 300 حرف")]
    public string Title { get; set; } = string.Empty;

    [MaxLength(3000, ErrorMessage = "الوصف يجب أن لا يتجاوز 3000 حرف")]
    public string? Description { get; set; }

    [Required(ErrorMessage = "نوع العقار مطلوب")]
    public PropertyType? Type { get; set; }

    [Required(ErrorMessage = "نوع الإدراج مطلوب")]
    [MaxLength(100)]
    public string ListingType { get; set; } = string.Empty;

    [Range(0.001, 9_999_999_999.0, ErrorMessage = "السعر يجب أن يكون أكبر من صفر")]
    public decimal Price { get; set; }

    [MaxLength(10)]
    public string Currency { get; set; } = "SYP";

    [Range(1, 999_999, ErrorMessage = "المساحة يجب أن تكون أكبر من صفر")]
    public decimal Area { get; set; }

    [Range(0, 20, ErrorMessage = "عدد غرف النوم يجب أن يكون بين 0 و 20")]
    public int? Bedrooms { get; set; }

    [Range(0, 10, ErrorMessage = "عدد الحمامات يجب أن يكون بين 0 و 10")]
    public int? Bathrooms { get; set; }

    [Range(0, 10, ErrorMessage = "عدد الصالات يجب أن يكون بين 0 و 10")]
    public int? HallsCount { get; set; }

    [MaxLength(150, ErrorMessage = "اسم الحي يجب أن لا يتجاوز 150 حرف")]
    public string? Neighborhood { get; set; }

    [MaxLength(300, ErrorMessage = "العنوان التفصيلي يجب أن لا يتجاوز 300 حرف")]
    public string? Address { get; set; }

    [MaxLength(100, ErrorMessage = "اسم المحافظة يجب أن لا يتجاوز 100 حرف")]
    public string? Province { get; set; }

    [Required(ErrorMessage = "المدينة مطلوبة")]
    [MaxLength(100, ErrorMessage = "اسم المدينة يجب أن لا يتجاوز 100 حرف")]
    public string City { get; set; } = string.Empty;

    [Range(-90.0, 90.0, ErrorMessage = "خط العرض يجب أن يكون بين -90 و 90")]
    public double? Latitude { get; set; }

    [Range(-180.0, 180.0, ErrorMessage = "خط الطول يجب أن يكون بين -180 و 180")]
    public double? Longitude { get; set; }

    public Guid? CompanyId { get; set; }
    public Guid? AgentId { get; set; }

    // ── Payment ───────────────────────────────────────────────────────────────
    [MaxLength(30)]
    public string PaymentType { get; set; } = "OneTime"; // OneTime | Installments

    [Range(2, 120)]
    public int? InstallmentsCount { get; set; }

    public bool HasCommission { get; set; } = false;

    [MaxLength(20)]
    public string? CommissionType { get; set; } // Percentage | Fixed

    [Range(0, 9_999_999_999)]
    public decimal? CommissionValue { get; set; }

    // ── Property characteristics ──────────────────────────────────────────────
    [MaxLength(60)]
    public string? OwnershipType { get; set; }

    [MaxLength(60)]
    public string? Floor { get; set; }

    [Range(0, 200)]
    public int? PropertyAge { get; set; }

    // JSON array of feature keys e.g. ["Pool","Garden","Elevator"]
    public List<string>? Features { get; set; }

    // ── Media ────────────────────────────────────────────────────────────────
    // Base64 data URLs for images (first one becomes primary)
    public List<string>? Images { get; set; }

    // Base64 data URL or external URL for video
    public string? VideoUrl { get; set; }
}
