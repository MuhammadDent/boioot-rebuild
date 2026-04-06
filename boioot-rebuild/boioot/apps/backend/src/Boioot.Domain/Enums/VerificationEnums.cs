namespace Boioot.Domain.Enums;

/// <summary>Overall verification status of a user account.</summary>
public enum VerificationStatus
{
    None,
    Pending,
    PartiallyVerified,
    Verified,
    Rejected,
}

/// <summary>Ordered trust level — higher = more trusted.</summary>
public enum VerificationLevelValue
{
    None     = 0,
    Basic    = 1,
    Identity = 2,
    Business = 3,
    Trusted  = 4,
}

/// <summary>State of the identity-document review.</summary>
public enum IdentityVerificationStatus
{
    None,
    Pending,
    Approved,
    Rejected,
}

/// <summary>State of the business/professional-licence review.</summary>
public enum BusinessVerificationStatus
{
    None,
    Pending,
    Approved,
    Rejected,
}
