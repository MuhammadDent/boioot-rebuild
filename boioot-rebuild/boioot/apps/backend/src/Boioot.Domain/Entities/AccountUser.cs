using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

public class AccountUser
{
    public Guid AccountId { get; set; }
    public Guid UserId { get; set; }

    /// <summary>Admin = can manage the account. Agent = can post listings on behalf of account.</summary>
    public OrganizationUserRole OrganizationUserRole { get; set; } = OrganizationUserRole.Agent;

    /// <summary>True for the main admin user of the account.</summary>
    public bool IsPrimary { get; set; } = false;

    /// <summary>Inactive members cannot post or manage until re-activated.</summary>
    public bool IsActive { get; set; } = true;

    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    public Account Account { get; set; } = null!;
    public User User { get; set; } = null!;
}
