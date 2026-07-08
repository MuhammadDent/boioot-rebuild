# 11 · Project Bootstrap Checklist

> The consolidated, phase-ordered checklist for starting a production-grade
> SaaS application — merged from every chapter's "Checklist for future
> projects" and sequenced by *when each item must exist*. Items marked 🟢 are
> proven in Boioot; 🔵 are practices Boioot's gaps taught the value of.

## Phase 0 — Before writing code (half a day)

- [ ] 🟢 Write the **constraint list**: market payment rails, language/direction, hosting platform limits (RAM, disk lifetime), team size, compliance regime *(constraints generate architecture — ch. 08 P19)*
- [ ] 🟢 Draw the full request path **including every proxy** (CDN → host → app) — decide IP/header/cookie/caching handling per hop
- [ ] 🔵 Choose topology by team structure (default: proxied UI + API monolith)
- [ ] 🔵 Decide token/session model **before** writing login (BFF cookie vs split model)
- [ ] 🔵 Decide migration strategy and write down its rollback story
- [ ] 🔵 Write trigger conditions for deferred patterns (CQRS, outbox, value objects — ch. 10 Part 2)

## Phase 1 — Day one (the first commit)

**Backend skeleton**
- [ ] 🟢 Project layering with enforced one-directional references
- [ ] 🟢 Single composition root; scoped services with the ORM
- [ ] 🔵 Typed options + validate-on-start (missing config kills boot, not requests)
- [ ] 🟢 `BaseEntity` (UUID key — prefer v7; CreatedAt/UpdatedAt auto-set in one place)
- [ ] 🟢 Global exception handler; one error JSON shape; no stack traces to clients
- [ ] 🟢 `PagedResult<T>` envelope before the second endpoint
- [ ] 🟢 `/health` endpoint; 🔵 `/version` endpoint returning git SHA

**Frontend skeleton**
- [ ] 🟢 Correct `lang`/`dir` on `<html>` from the first page
- [ ] 🟢 One API client wrapper (auth, refresh, error normalization) — no raw fetch in components
- [ ] 🟢 Route groups per audience; guards at the owning layout
- [ ] 🔵 Type checking enforced in production build (never `ignoreBuildErrors`)

## Phase 2 — Week one (before features multiply)

- [ ] 🔵 CI: build + test + type-check on every PR — **before** any deploy automation
- [ ] 🟢 Deploy automation, path-filtered, from the main branch only
- [ ] 🔵 Auth lifecycle **complete or bought**: register → email verify → login → reset → revoke *(taught by Boioot's most instructive gap — login/refresh/revoke are 🟢 strong, but reset & verification are missing; ch. 05/07)*
- [ ] 🟢 Password policy central + tiered (admin tier stricter); BCrypt/Argon2id
- [ ] 🟢 Refresh tokens: HttpOnly, hashed at rest, rotating, family-revoked
- [ ] 🟢 Lockout + rate limits keyed on proxy-correct client identity, tested through the real chain
- [ ] 🟢 Soft-delete decision per entity; global filters where yes; quota/uniqueness semantics written down
- [ ] 🟢 Sequence-backed reference numbers for anything customer-facing

## Phase 3 — Before first real users

- [ ] 🔵 Object storage as the *only* write path for user files (presign → finalize-verify → re-encode is 🟢 in Boioot, but a silent local-disk fallback remains when R2 is unconfigured — make the fallback fail loudly instead)
- [ ] 🔵 Exception tracking + uptime probe + log retention (the observability minimum)
- [ ] 🟢 Security headers on every browser-visible tier (app + proxy + CDN consistent)
- [ ] 🟢 SEO surface with graceful degradation: robots, sitemap that never 500s, metadata
- [ ] 🟢 Server-side visibility filtering on every public query (moderation/authorization in SQL, not client)
- [ ] 🔵 Cache policy on error responses; CDN purge step in the deploy story
- [ ] 🟢 Start the **gaps register** (ch. 07 format): what is Not Implemented, ranked, with reasons

## Phase 4 — Before money flows

- [ ] 🟢 Entitlement checks centralized in one service before the second gated feature
- [ ] 🟢 Every quota: counts-when / refunds-when / resets-when / anti-gaming answers
- [ ] 🟢 Payment as a state machine with an approval event; nothing activates on submission
- [ ] 🔵 Money as integer minor units + currency code; idempotency keys on payment mutations
- [ ] 🔵 Characterization tests around billing/subscription/quota logic **before** the next change to them
- [ ] 🟢 Support path exempt from all paywalls

## Phase 5 — Before scaling out (instance #2)

- [ ] 🔵 Rate-limit/lockout state moved to Redis (in-memory becomes per-instance — ch. 05)
- [ ] 🔵 Concurrency tokens on admin-editable rows (two admins, one screen)
- [ ] 🔵 Session/cache state audit: nothing request-critical in process memory
- [ ] 🔵 MFA for admin accounts; security audit trail for privileged actions
- [ ] 🔵 Re-rank the gaps register — stage change re-prioritizes everything

---

## Lessons learned
- Sequencing matters more than completeness: Boioot shows what happens when Phase-2 auth items (reset/verify) slip behind Phase-4 features — the product works, but accounts can't recover.
- Half of Phase 1 costs minutes (`/version`, error shape, envelope) and saves incident-days later.

## Common mistakes
- Doing Phase 4 (billing) before Phase 2 (auth lifecycle, CI) because revenue feels urgent.
- Treating this as a one-time list instead of re-entering at each phase gate.

## Best practices
- Copy this file into every new project; check items off in the repo, visibly.
- At each phase gate, mark skipped items *deferred-with-reason* — silence is drift.

## Rules to remember
- **Phases are gates, not suggestions — money doesn't flow before Phase 4 is green.**
- **Every unchecked box is a line in the gaps register, not a secret.**

## Checklist for future projects
- [ ] This file *is* the checklist — clone it, date it, and keep it in the new repo's docs
