namespace Boioot.Application.Features.Plans.DTOs;

public class PlanDetailResponse : PlanSummaryResponse
{
    public List<PlanLimitItem>   Limits   { get; set; } = [];
    public List<PlanFeatureItem> Features { get; set; } = [];
}
