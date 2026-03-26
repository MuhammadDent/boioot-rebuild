using Boioot.Domain.Common;
using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

public class User : BaseEntity, ISoftDeletable
{
    public string UserCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.User;
    public bool IsActive { get; set; } = true;
    public bool IsDeleted { get; set; } = false;
    public string? ProfileImageUrl { get; set; }

    /// <summary>
    /// Counts how many listings this user has ever successfully created while on the
    /// free-trial (User role). Incremented on creation, never decremented on deletion.
    /// Used to enforce the 2-listing all-time trial cap.
    /// </summary>
    public int TrialListingsUsed { get; set; } = 0;

    /// <summary>
    /// UTC timestamp of the last successful login. Set by AuthService on login.
    /// </summary>
    public DateTime? LastLoginAt { get; set; }

    public Agent? Agent { get; set; }
    public ICollection<Review> Reviews { get; set; } = [];
    public ICollection<AccountUser> AccountUsers { get; set; } = [];
}
