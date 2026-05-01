namespace Boioot.Application.Features.Matching.DTOs;

public class MyLeadsResponseDto
{
    public bool                      IsLaunchMode { get; set; }
    public int                       TotalCount   { get; set; }
    public List<BuyerRequestLeadDto> Leads        { get; set; } = [];
}
