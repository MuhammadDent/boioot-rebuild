namespace Boioot.Application.Features.Admin.DTOs;

public class AdminUserResponse
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? ProfileImageUrl { get; set; }
    public string Role { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public int ListingCount { get; set; }
    public string? PlanName { get; set; }
    public string PlanStatus { get; set; } = "None";
    public List<string> Tags { get; set; } = [];

    // ── Identity verification ─────────────────────────────────────────────────
    public bool IsVerified { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public string? VerifiedBy { get; set; }
}

public class UserAnalyticsResponse
{
    public int TotalUsers { get; set; }
    public int ActiveUsers { get; set; }
    public int InactiveUsers { get; set; }
    public int DeletedUsers { get; set; }
    public int NewThisMonth { get; set; }
    public int NewThisWeek { get; set; }
    public int LoggedInLast30Days { get; set; }
    public Dictionary<string, int> ByRole { get; set; } = [];
    public Dictionary<string, int> ByPlan { get; set; } = [];
}

public class UserTagResponse
{
    public string Tag { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class BulkUserActionRequest
{
    public List<Guid> UserIds { get; set; } = [];
    /// <summary>activate | deactivate | export</summary>
    public string Action { get; set; } = string.Empty;
}

public class BulkUserActionResponse
{
    public int Affected { get; set; }
    public string Message { get; set; } = string.Empty;
    public List<AdminUserResponse>? ExportData { get; set; }
}

public class AddUserTagRequest
{
    public string Tag { get; set; } = string.Empty;
}
