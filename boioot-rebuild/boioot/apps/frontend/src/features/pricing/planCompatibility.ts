import type { PublicPricingItem } from "./types";

/**
 * Derives the audience type that applies to the current user.
 *
 * Priority order:
 *  1. currentSub.audienceType  — most accurate, comes directly from the user's active plan
 *  2. user.role fallback       — unambiguous for User / Owner / Broker / Agent
 *  3. null                     — Admin, or CompanyOwner with no subscription yet (show all)
 */
export function getAudienceTypeForUser(
  userRole: string | null | undefined,
  currentSubAudienceType: string | null | undefined,
): string | null {
  if (currentSubAudienceType) return currentSubAudienceType.toLowerCase();
  switch (userRole) {
    case "User":   return "seeker";
    case "Owner":  return "owner";
    case "Broker": return "broker";
    case "Agent":  return "office";
    // CompanyOwner with no subscription — cannot determine type; show all
    // Admin — should see everything
    default: return null;
  }
}

/**
 * Returns only the plans whose audienceType matches the given value.
 * If audienceType is null (Admin / unknown), returns the full list unchanged.
 */
export function filterPlansForAudience(
  plans: PublicPricingItem[],
  audienceType: string | null,
): PublicPricingItem[] {
  if (!audienceType) return plans;
  return plans.filter(
    (p) => (p.audienceType ?? "").toLowerCase() === audienceType,
  );
}

/** Arabic display labels for each audience type */
export const AUDIENCE_TYPE_LABEL: Record<string, string> = {
  seeker:  "باحث عن عقار",
  owner:   "مالك عقار",
  broker:  "وسيط عقاري",
  office:  "مكتب عقاري",
  company: "شركة تطوير عقاري",
};
