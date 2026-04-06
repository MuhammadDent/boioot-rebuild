// ─────────────────────────────────────────────────────────────────────────────
// featureAccess.ts — SINGLE SOURCE OF TRUTH for feature visibility control.
//
// Governs BOTH the sidebar and dashboard widgets. All feature-gate logic
// must derive from this map — never from ad-hoc role/permission checks.
//
// Rules:
//   • `roles`        — backend role strings that may access the feature.
//   • `accountTypes` — optional sub-filter on account type (e.g. "Company").
//                      When omitted, all account types within the role set are allowed.
//   • `planFeature`  — optional plan feature key checked via canAccess() hook.
//                      UI is hidden when the user's active plan does not include it.
//
// User types and their backend role equivalents:
//   seeker  → "User"
//   owner   → "Owner"
//   broker  → "Broker"
//   office  → "CompanyOwner" (accountType = "Office")
//   company → "CompanyOwner" (accountType = "Company")
//   agent   → "Agent"
//   admin   → "Admin" / "Staff"
// ─────────────────────────────────────────────────────────────────────────────

import type { FeatureKey } from "@/features/plan/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export type FeatureRule = {
  roles: string[];
  accountTypes?: string[];
  planFeature?: FeatureKey;
};

export type FeatureAccessKey =
  | "listings"
  | "my_listings"
  | "agents"
  | "team_management"
  | "projects"
  | "messages"
  | "analytics"
  | "requests"
  | "clients"
  | "subscription"
  | "verification";

// ── Feature Access Map ────────────────────────────────────────────────────────
//
// This is the AUTHORITATIVE map. Any new gated feature must be added here.
// Sidebar config, dashboard pages, and route guards all consume this map.

export const FEATURE_ACCESS: Record<FeatureAccessKey, FeatureRule> = {

  // Listings: all business roles can post and manage listings.
  listings: {
    roles: ["Owner", "Broker", "CompanyOwner", "Agent", "Admin", "Staff"],
  },

  // My Listings: personal listing management (same as listings, broader set).
  my_listings: {
    roles: ["Owner", "Broker", "CompanyOwner", "Agent", "User", "Admin", "Staff"],
  },

  // Agents: managing a team of agents. Office AND Company both qualify.
  // "Broker" (individual) and "Owner" are EXCLUDED.
  agents: {
    roles: ["CompanyOwner", "Admin", "Staff"],
    // No accountTypes restriction → both Office AND Company CompanyOwners allowed.
  },

  // Team management: same audience as agents.
  team_management: {
    roles: ["CompanyOwner", "Admin", "Staff"],
  },

  // Projects: Company accounts only. Office accounts are excluded.
  // Enforced both here and by the backend "CompanyProjectsOnly" policy.
  projects: {
    roles: ["CompanyOwner", "Admin", "Staff"],
    accountTypes: ["Company"],
    planFeature: "project_management",
  },

  // Messages: all authenticated business/account roles.
  messages: {
    roles: ["Owner", "Broker", "CompanyOwner", "Agent", "User", "Admin", "Staff"],
  },

  // Analytics dashboard: management roles only.
  analytics: {
    roles: ["Broker", "CompanyOwner", "Agent", "Admin", "Staff"],
    planFeature: "analytics_dashboard",
  },

  // Listing requests / incoming leads.
  requests: {
    roles: ["Owner", "Broker", "CompanyOwner", "Agent", "Admin", "Staff"],
  },

  // Clients: agent-specific CRM section.
  clients: {
    roles: ["Agent", "Admin", "Staff"],
  },

  // Subscription management (not for Admin/Staff — they have their own billing panel).
  subscription: {
    roles: ["Owner", "Broker", "CompanyOwner", "Agent", "User"],
  },

  // Identity verification.
  verification: {
    roles: ["Owner", "Broker", "CompanyOwner", "Agent", "Admin", "Staff"],
  },
};

// ── canAccessFeature ──────────────────────────────────────────────────────────
//
// Pure function — no React hooks, safe to call anywhere (pages, config, guards).
//
// Pass `planCanAccess` when calling from a component that has the usePlan() hook.
// Omit it to skip the plan-feature check (e.g. in sidebar.config.ts which is
// evaluated outside React; the AppSidebar handles plan gating separately via
// `canFeature(item.feature)`).

export function canAccessFeature(
  user: { role?: string | null; accountType?: string | null } | null | undefined,
  feature: FeatureAccessKey,
  planCanAccess?: (key: FeatureKey) => boolean,
): boolean {
  if (!user) return false;

  const rule = FEATURE_ACCESS[feature];
  if (!rule) return false;

  // 1. Role check
  if (!rule.roles.includes(user.role ?? "")) return false;

  // 2. Account-type sub-filter
  if (rule.accountTypes && !rule.accountTypes.includes(user.accountType ?? "")) return false;

  // 3. Plan feature check (optional — only when caller provides the resolver)
  if (rule.planFeature && planCanAccess && !planCanAccess(rule.planFeature)) return false;

  return true;
}
