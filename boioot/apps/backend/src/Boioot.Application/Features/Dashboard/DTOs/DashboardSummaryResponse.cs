namespace Boioot.Application.Features.Dashboard.DTOs;

public class DashboardSummaryResponse
{
    public int TotalProperties { get; set; }
    public int TotalProjects { get; set; }
    public int TotalRequests { get; set; }
    public int NewRequests { get; set; }
    public int TotalConversations { get; set; }
    public int UnreadMessages { get; set; }
}
