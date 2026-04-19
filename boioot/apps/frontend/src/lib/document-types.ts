/**
 * Single source of truth for verification document types.
 * Values must match the backend DocumentType enum exactly (case-sensitive).
 *
 * Backend enum (Boioot.Domain.Enums.DocumentType):
 *   NationalId | Passport | ResidencePermit | CommercialRegistration
 *   BrokerageLicense | OfficeLicense | OwnershipProof | Other
 */

export const DOCUMENT_TYPES = [
  "NationalId",
  "Passport",
  "ResidencePermit",
  "CommercialRegistration",
  "BrokerageLicense",
  "OfficeLicense",
  "OwnershipProof",
  "Other",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/** Arabic display labels for each backend enum value. */
export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  NationalId:             "الهوية الوطنية",
  Passport:               "جواز السفر",
  ResidencePermit:        "تصريح إقامة",
  CommercialRegistration: "السجل التجاري",
  BrokerageLicense:       "رخصة وساطة",
  OfficeLicense:          "رخصة مكتب",
  OwnershipProof:         "سند الملكية",
  Other:                  "مستند آخر",
};

/**
 * General dropdown options used in AddDocumentForm.
 * label = Arabic display text (never sent to API).
 * value = exact backend enum string (always sent to API).
 */
export const DOCUMENT_TYPE_OPTIONS = [
  { value: "NationalId",             label: "الهوية الوطنية" },
  { value: "Passport",               label: "جواز السفر" },
  { value: "Other",                  label: "رخصة القيادة" },
  { value: "CommercialRegistration", label: "السجل التجاري" },
  { value: "Other",                  label: "الشهادة الضريبية" },
  { value: "OwnershipProof",         label: "سند الملكية" },
  { value: "Other",                  label: "مستند آخر" },
] as const;

/** Identity-specific options used in NewRequestForm. */
export const IDENTITY_DOC_TYPE_OPTIONS = [
  { value: "NationalId", label: "الهوية الوطنية" },
  { value: "Passport",   label: "جواز السفر" },
  { value: "Other",      label: "رخصة القيادة" },
] as const;

/** Business-specific options used in NewRequestForm. */
export const BUSINESS_DOC_TYPE_OPTIONS = [
  { value: "CommercialRegistration", label: "السجل التجاري" },
  { value: "Other",                  label: "الشهادة الضريبية" },
] as const;

/** Returns true only if the string is a valid backend DocumentType value. */
export function isValidDocumentType(type: string): type is DocumentType {
  return (DOCUMENT_TYPES as readonly string[]).includes(type);
}
