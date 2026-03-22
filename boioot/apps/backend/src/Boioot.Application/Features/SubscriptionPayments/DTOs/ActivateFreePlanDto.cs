using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.SubscriptionPayments.DTOs;

public class ActivateFreePlanDto
{
    [Required]
    public Guid PlanId { get; set; }
}
