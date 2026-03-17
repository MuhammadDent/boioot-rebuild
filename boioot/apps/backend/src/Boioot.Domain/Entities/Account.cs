using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

public class Account : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    public AccountType AccountType { get; set; } = AccountType.Individual;

    public Guid OwnerUserId { get; set; }

    public Guid? PlanId { get; set; }

    public bool IsActive { get; set; } = true;

    public User OwnerUser { get; set; } = null!;
    public Plan? Plan { get; set; }

    public ICollection<AccountUser> AccountUsers { get; set; } = [];
    public ICollection<Subscription> Subscriptions { get; set; } = [];
}
