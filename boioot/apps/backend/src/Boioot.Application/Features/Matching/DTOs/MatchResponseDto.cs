namespace Boioot.Application.Features.Matching.DTOs;

/// <summary>Full response returned by GET /api/matching/buyer-requests/{id}.</summary>
public class MatchResponseDto
{
    public Guid    RequestId           { get; set; }
    public string  RequestTitle        { get; set; } = string.Empty;
    public string? RequestCity         { get; set; }
    public string? RequestNeighborhood { get; set; }

    /// <summary>Total number of matched users (before visibility restrictions).</summary>
    public int TotalCount { get; set; }

    /// <summary>
    /// True while Matching:LaunchMode = true in config.
    /// In launch mode: all matches visible, lockedMatchesCount = 0.
    /// </summary>
    public bool IsLaunchMode { get; set; }

    /// <summary>Whether the user has explicitly unlocked this request (future paid feature).</summary>
    public bool IsUnlocked { get; set; }

    /// <summary>Number of matches hidden due to plan restrictions. Always 0 in LaunchMode.</summary>
    public int LockedMatchesCount { get; set; }

    /// <summary>The calling user's matching feature set.</summary>
    public MatchingUserFeaturesDto UserFeatures { get; set; } = new();

    /// <summary>Visible matches (all in LaunchMode, first 2 otherwise unless unlocked).</summary>
    public List<MatchResultDto> Matches { get; set; } = [];
}
