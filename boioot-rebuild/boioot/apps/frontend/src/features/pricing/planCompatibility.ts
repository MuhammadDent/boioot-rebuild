import type { PublicPricingItem } from "./types";

/**
 * Derives the audience type that applies to the current user.
 *
 * BUG FIX: The backend's fallback free plan (FreePlanId = 00000001 = seeker_free)
 * returns audienceType="seeker" for ANY user who has no active subscription.
 * If we trusted currentSub.audienceType blindly, an Owner with no subscription
 * would be treated as a seeker and would see seeker plans instead of owner plans.
 *
 * Fix: For roles with an unambiguous audience type (Owner, Broker, Agent),
 * ALWAYS derive from the role — never from currentSub.audienceType which may
 * reflect the wrong free-plan type.
 *
 * Only the "User" role is genuinely ambiguous (they can be seekers across
 * different plan contexts), so we keep the subscription-based logic for them.
 */
export function getAudienceTypeForUser(
  userRole: string | null | undefined,
  currentSubAudienceType: string | null | undefined,
): string | null {
  switch (userRole) {
    // Unambiguous roles — always derive from role, never from subscription audienceType.
    // This prevents the cross-role free plan (seeker_free) from polluting the filter.
    case "Owner":  return "owner";
    case "Broker": return "broker";
    case "Agent":  return "office";

    // User role is ambiguous — use subscription audienceType if available.
    case "User":
      if (currentSubAudienceType) return currentSubAudienceType.toLowerCase();
      return "seeker";

    // CompanyOwner with no subscription — cannot determine type; show all.
    // Admin — should see everything.
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
