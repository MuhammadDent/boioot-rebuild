# 12 · Future Improvements Roadmap

> 🟡 **This entire chapter is Recommendation** — a proposed sequencing of the
> verified gaps from [chapter 07](07-gaps-and-recommendations.md) into an
> actionable roadmap. Nothing here is implemented; nothing here is invented as
> implemented. Gap numbers (#N) reference chapter 07's register.

## Phase 1 — Week-one wins (hours each, zero product risk)

| Item | Gap | What & why | Done when |
|---|---|---|---|
| 1.1 CI quality gate | #11 | GitHub Action: `dotnet build` + `dotnet test` + `next build` (typecheck on) on every PR; the repo already has tests nothing runs | A red PR cannot merge |
| 1.2 Type-checked builds | #12 | Remove `typescript.ignoreBuildErrors: true` from `next.config.ts`; fix surfaced errors | `next build` fails on TS errors |
| 1.3 `/version` endpoint | #14 | API + frontend expose deployed git SHA; kills the deployment-drift blindness class (38-commits-ahead incident) | One curl answers "what is prod running?" |
| 1.4 Docs refresh | #18 | Fix `README.md` (claims SQL Server, "no code yet"); date-stamp `PORTABILITY.md` | No doc contradicts the codebase |

## Phase 2 — Account lifecycle (the flow gaps)

| Item | Gap | What & why | Done when |
|---|---|---|---|
| 2.1 SMTP configuration | #2 | `LoggingEmailService` already sends when `Email:SmtpHost`/`FromAddress` configured — provision a provider (SES/Postmark/Resend) and set secrets | `[EMAIL-SENT]` in prod logs |
| 2.2 Password reset backend | #1 | Token-based reset endpoints (single-use, hashed, short-TTL tokens — mirror the refresh-token storage discipline already in `AuthService`) wired to the existing `/forgot-password` page | A locked-out user recovers unassisted |
| 2.3 Email verification | #3 | Verify-on-register loop; decide policy for existing accounts (grandfather vs prompt) | New accounts confirm before full activation |

## Phase 3 — Money safety net

| Item | Gap | What & why | Done when |
|---|---|---|---|
| 3.1 Characterization tests | #9 | Tests around subscription transitions, quota consumption (incl. no-refund-on-delete), billing approval, entitlement gating — *lock in current behavior before changing it* | Commerce logic changes break tests, not customers |
| 3.2 Frontend smoke tests | #10 | Playwright: login, post listing, subscribe, admin approve — the four money paths | CI runs them per PR |

## Phase 4 — Scale prerequisites (before instance #2)

| Item | Gap | What & why | Done when |
|---|---|---|---|
| 4.1 Distributed abuse state | #5 | Redis-backed lockout store + rate limiter state (or push volumetric limits to Cloudflare) — in-memory budgets multiply per instance | Lockout survives restart; N instances share one budget |
| 4.2 Optimistic concurrency | #13 | Concurrency tokens on admin-edited entities (plans, pricing, site settings, pages) | Second-writer gets a conflict, not a silent overwrite |
| 4.3 Observability floor | #14 | Sentry (both tiers) + uptime probe + alert channel | An exception pages someone before a user reports it |

## Phase 5 — Hardening & structure

| Item | Gap | What & why | Done when |
|---|---|---|---|
| 5.1 Admin MFA | #4 | TOTP for the admin tier first (matches the tiered password policy philosophy) | Admin login requires a second factor |
| 5.2 Audit trail | #6 | Append-only log of privileged actions (payment confirmations, RBAC changes, moderation decisions) | Any admin action answers who/what/when |
| 5.3 `AdminService` split | #15 | Carve the >2000-line service along admin use-case lines *after* 3.1 tests exist | No admin service file >~500 lines |
| 5.4 `Features` → jsonb | #16 | Replace JSON-in-TEXT + `LIKE` with jsonb + GIN index (or a join table) | Featured-listing queries use an index |
| 5.5 Systematic soft-delete filters | #17 | Loop over `ISoftDeletable` types in `OnModelCreating` instead of per-config opt-in | No entity can forget its filter |

## Explicitly NOT on this roadmap (🟢-ok, re-evaluate on stage change)
i18n framework · React Query/Redux · microservices/queues · replacing manual payment-proof billing · keyset pagination. Reasons in chapter 07 §D.

## Sequencing logic
1. Process fixes before code fixes (Phase 1 makes every later phase safer).
2. Flows before features (Phase 2 completes journeys users are already on).
3. Tests before refactors (3.1 gates 5.3).
4. Distribution before scale-out (Phase 4 is a *precondition* of instance #2, not a follow-up).

---

## Lessons learned
- A roadmap derived from a verified gaps register is defensible line-by-line; a roadmap from intuition is a wish list.
- The cheapest items (Phase 1) remove *classes* of failure; the expensive ones (5.3) remove single bottlenecks — order accordingly.

## Common mistakes
- Starting with the glamorous item (MFA! audit logs!) while CI and type checks stay red.
- Refactoring the god service before characterization tests exist.
- Treating "NOT on this roadmap" items as backlog — they are decisions, not omissions.

## Best practices
- Re-derive this roadmap from the gaps register after every phase completes.
- Each item ships with its "Done when" — unverifiable roadmap items rot.

## Rules to remember
- **Tests gate refactors; distribution gates scale-out; process gates everything.**

## Checklist for future projects
- [ ] Maintain roadmap and gaps register as a pair — every roadmap item cites a gap, every 🔴 gap appears in a phase
- [ ] Give every item a "Done when" acceptance line
- [ ] Keep a visible "deliberately not doing" section with reasons
