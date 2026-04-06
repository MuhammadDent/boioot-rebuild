using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

public class Account : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    public AccountType AccountType { get; set; } = AccountType.Individual;

    /// <summary>The user who created this account (required).</summary>
    public Guid CreatedByUserId { get; set; }

    /// <summary>
    /// The primary admin of this account.
    /// Optional — defaults to CreatedByUserId in practice,
    /// but kept separate to allow reassignment without changing audit trail.
    /// </summary>
    public Guid? PrimaryAdminUserId { get; set; }

    public Guid? PlanId { get; set; }

    public bool IsActive { get; set; } = true;

    public User CreatedByUser { get; set; } = null!;
    public User? PrimaryAdminUser { get; set; }
    public Plan? Plan { get; set; }

    public ICollection<AccountUser> AccountUsers { get; set; } = [];
    public ICollection<Subscription> Subscriptions { get; set; } = [];
}
