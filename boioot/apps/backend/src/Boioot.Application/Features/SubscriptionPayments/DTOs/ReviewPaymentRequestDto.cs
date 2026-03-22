using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.SubscriptionPayments.DTOs;

public class ReviewPaymentRequestDto
{
    /// <summary>Admin note — required on rejection, optional on approval.</summary>
    [MaxLength(1000)]
    public string? Note { get; set; }
}
