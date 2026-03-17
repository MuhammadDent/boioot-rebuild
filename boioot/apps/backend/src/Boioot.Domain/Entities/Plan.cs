namespace Boioot.Domain.Entities;

public class Plan : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    public int ListingLimit { get; set; } = 2;

    public int ProjectLimit { get; set; } = 0;

    public int AgentLimit { get; set; } = 0;

    public int FeaturedSlots { get; set; } = 0;

    public decimal PriceMonthly { get; set; } = 0;

    public decimal PriceYearly { get; set; } = 0;

    public bool IsActive { get; set; } = true;

    public ICollection<Account> Accounts { get; set; } = [];
    public ICollection<Subscription> Subscriptions { get; set; } = [];
}
