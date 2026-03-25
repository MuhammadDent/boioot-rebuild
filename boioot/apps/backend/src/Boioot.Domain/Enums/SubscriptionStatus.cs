namespace Boioot.Domain.Enums;

public enum SubscriptionStatus
{
    /// <summary>Account is in a free trial period.</summary>
    Trial,

    /// <summary>Subscription is paid and fully active.</summary>
    Active,

    /// <summary>Created but not yet confirmed (e.g. awaiting admin approval or payment).</summary>
    Pending,

    /// <summary>Payment failed but subscription has a grace period.</summary>
    PastDue,

    /// <summary>Subscription has ended naturally (period elapsed, not renewed).</summary>
    Expired,

    /// <summary>Manually cancelled by user or admin before period end.</summary>
    Cancelled,
}
