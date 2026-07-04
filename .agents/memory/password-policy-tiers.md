---
name: Password policy tiers
description: Role-differentiated password rules centralized in PasswordPolicy (Standard vs Admin) and how tier is chosen per call site
---

# Password policy tiers

All password rules live in `PasswordPolicy` (Application/Common). A `PasswordTier` enum drives two rule sets:
- **Standard** (regular users + agents/brokers): min 8, ≥1 letter + ≥1 digit. No uppercase/special required.
- **Admin** (Admin role only): min 12, ≥1 upper + ≥1 lower + ≥1 digit + ≥1 special.
Both tiers also reject a common-password blocklist and any password containing the email local-part.

`EnsureValid(password, tier, email)` requires the tier explicitly (no defaulted overload) so a call site cannot silently under-validate. `TierForRole(UserRole)` returns Admin only for `UserRole.Admin`, else Standard.

**Tier selection per call site:** public registration = Standard (registration force-excludes Admin role); own-password change = `TierForRole(user.Role)`; admin CreateUser = `TierForRole(role)` (role parsed from request); CreateAdminAgent / CreateAdminBroker / CreateAgent = Standard.

**Why DTO MinLength is 8 everywhere (a floor, not the real rule):** the same request DTOs serve multiple roles (e.g. admin CreateUser can create any role), so a static attribute cannot express the admin=12 rule. DTO MinLength(8) is only a coarse first-pass; the authoritative tier enforcement is in `PasswordPolicy`. Do not raise a shared DTO back to 12 — it would wrongly reject valid Standard passwords before the policy runs.

**Why the standalone `"boioot"` blocked term was removed:** the blocklist uses substring `Contains`, so a bare `"boioot"` term rejects every brand-adjacent password (e.g. the intended-valid `"boioot12"`). Keep `"boioot123"` and other genuinely-common terms; do not re-add the bare brand term.

**Frontend parity:** `frontend/src/lib/passwordPolicy.ts` mirrors these rules with a `tier` param (default "standard"). It is UX-only; the server is authoritative. The profile change-password form passes `admin` tier when `raw.role === "Admin"`.

**How to apply:** any new password creation/change path must call `PasswordPolicy.EnsureValid` with the correct tier, and keep the frontend mirror + DTO floor in sync.
