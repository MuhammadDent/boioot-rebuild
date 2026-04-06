namespace Boioot.Application.Features.Dashboard.DTOs;

public class DashboardAnalyticsResponse
{
    // ── KPI – Listings breakdown ────────────────────────────────────────────
    public int TotalListings    { get; set; }
    public int ActiveListings   { get; set; }
    public int InactiveListings { get; set; }
    public int SoldListings     { get; set; }
    public int RentedListings   { get; set; }

    // ── KPI – Business ──────────────────────────────────────────────────────
    public int TotalProjects { get; set; }
    public int TotalAgents   { get; set; }

    // ── KPI – Engagement ────────────────────────────────────────────────────
    public int  TotalRequests { get; set; }
    public int  NewRequests   { get; set; }
    public long TotalViews    { get; set; }

    // ── Trends (last 6 calendar months) ─────────────────────────────────────
    public List<MonthlyDataPoint> MonthlyListings  { get; set; } = [];
    public List<MonthlyDataPoint> MonthlyRequests  { get; set; } = [];

    // ── Insights ─────────────────────────────────────────────────────────────
    public List<TopListingItem>       TopListings       { get; set; } = [];
    public List<AttentionListingItem> AttentionListings { get; set; } = [];
}

public record MonthlyDataPoint(string Label, int Count);

public record TopListingItem(
    Guid   Id,
    string Title,
    int    Views,
    int    RequestCount,
    string Status,
    string City);

public record AttentionListingItem(
    Guid   Id,
    string Title,
    string Issue);
