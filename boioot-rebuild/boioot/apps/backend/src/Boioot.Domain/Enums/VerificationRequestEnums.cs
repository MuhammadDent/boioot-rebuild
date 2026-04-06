namespace Boioot.Domain.Enums;

public enum VerificationType
{
    Identity,
    Business,
    Professional,
    Office,
    Company,
}

public enum VerificationRequestStatus
{
    Draft,
    Pending,
    Approved,
    Rejected,
    NeedsMoreInfo,
    Cancelled,
}

public enum DocumentType
{
    NationalId,
    Passport,
    ResidencePermit,
    CommercialRegistration,
    BrokerageLicense,
    OfficeLicense,
    OwnershipProof,
    Other,
}

public enum DocumentStatus
{
    Pending,
    Approved,
    Rejected,
}
