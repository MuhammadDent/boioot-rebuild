using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Bookings.DTOs;

public class CreateBookingRequest
{
    [Required]
    public Guid PropertyId { get; set; }

    [Required]
    public DateTime StartDate { get; set; }

    [Required]
    public DateTime EndDate { get; set; }

    [Required(ErrorMessage = "اسم الضيف مطلوب")]
    [MaxLength(120)]
    public string GuestName { get; set; } = string.Empty;

    [MaxLength(40)]
    public string? Phone { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }

    [Range(1, 50, ErrorMessage = "يجب أن يكون عدد الضيوف بين 1 و50")]
    public int GuestCount { get; set; } = 1;
}