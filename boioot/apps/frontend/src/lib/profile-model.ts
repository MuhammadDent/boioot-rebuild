import type { UserProfileResponse } from "@/types";

// ─── Role display labels (all real backend role values) ───────────────────────

export const ROLE_LABELS: Record<string, string> = {
  Admin:        "مدير النظام",
  CompanyOwner: "شركة تطوير عقاري",
  Broker:       "مكتب عقاري",
  Agent:        "وكيل عقاري",
  Owner:        "مالك عقار",
  User:         "مستخدم",
};

// ─── Role group — drives badge colour only ────────────────────────────────────

export type RoleGroup = "admin" | "business" | "agent" | "individual";

export function getRoleGroup(role: string): RoleGroup {
  if (role === "Admin")                          return "admin";
  if (role === "CompanyOwner" || role === "Broker") return "business";
  if (role === "Agent")                          return "agent";
  return "individual";
}

export const ROLE_GROUP_COLORS: Record<RoleGroup, { bg: string; text: string; border: string }> = {
  admin:      { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  business:   { bg: "#ede9fe", text: "#4c1d95", border: "#c4b5fd" },
  agent:      { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" },
  individual: { bg: "#dcfce7", text: "#14532d", border: "#86efac" },
};

// ─── Normalized profile view model ───────────────────────────────────────────
//
// All profile UI reads from this model, never from the raw API shape.
// Add more optional fields here when the backend starts returning them.

export interface NormalizedProfile {
  id:          string;
  userCode:    string;
  fullName:    string;
  email:       string;
  phone:       string | null;
  avatarUrl:   string | null;
  /** Raw role string from backend, e.g. "CompanyOwner" */
  role:        string;
  /** Arabic display label for the role */
  roleLabel:   string;
  /** Badge colour group */
  roleGroup:   RoleGroup;
  createdAt:   string;
  permissions: string[];
  // ── Optional role-specific fields (populated when backend sends them) ──────
  companyName?: string;
  officeName?:  string;
  agentTitle?:  string;
}

// ─── Mapper: UserProfileResponse → NormalizedProfile ─────────────────────────

export function normalizeProfile(raw: UserProfileResponse): NormalizedProfile {
  return {
    id:          raw.id,
    userCode:    raw.userCode,
    fullName:    raw.fullName,
    email:       raw.email,
    phone:       raw.phone     ?? null,
    avatarUrl:   raw.profileImageUrl ?? null,
    role:        raw.role,
    roleLabel:   ROLE_LABELS[raw.role] ?? raw.role,
    roleGroup:   getRoleGroup(raw.role),
    createdAt:   raw.createdAt,
    permissions: raw.permissions ?? [],
  };
}
