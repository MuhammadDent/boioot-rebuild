namespace Boioot.Application.Features.Dashboard.DTOs;

public class DashboardSummaryResponse
{
    public int TotalProperties { get; set; }
    public int TotalProjects { get; set; }
    public int TotalRequests { get; set; }
    public int NewRequests { get; set; }
    public int TotalConversations { get; set; }
    public int UnreadMessages { get; set; }

    // ── Subscription quota ────────────────────────────────────────────────
    /// <summary>Name of the active subscription plan, or null if no active subscription.</summary>
    public string? PlanName { get; set; }

    /// <summary>Number of active+inactive (non-deleted) listings consuming the quota.</summary>
    public int ListingsUsed { get; set; }

    /// <summary>Maximum allowed listings. -1 = unlimited. 0 = no active plan found.</summary>
    public int ListingsLimit { get; set; }

    /// <summary>Number of active agents in the account.</summary>
    public int AgentsUsed { get; set; }

    /// <summary>Maximum allowed agents. -1 = unlimited. 0 = no active plan found.</summary>
    public int AgentsLimit { get; set; }

    /// <summary>Whether the analytics dashboard feature is enabled for this plan.</summary>
    public bool HasAnalyticsDashboard { get; set; }
}
