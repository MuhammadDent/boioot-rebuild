# 07 · Gaps & Recommendations

> This chapter is the explicit register required by the analysis rules: every
> item below was **verified absent** from the codebase (not assumed). Each
> carries a label: 🔴 = address before/at scale, 🟠 = plan deliberately,
> 🟢-ok = acceptable as-is for current stage.

## A. Verified NOT implemented — security & auth

| # | Gap | Evidence of absence | Impact | Priority |
|---|---|---|---|---|
| 1 | **Password reset backend** | No `ForgotPassword/ResetPassword` in any controller/service; frontend page exists at `src/app/forgot-password/` with no endpoint to call | Locked-out users cannot recover accounts | 🔴 |
| 2 | **Email flows** | `LoggingEmailService.cs` sends via SMTP when `Email:SmtpHost`/`FromAddress` are configured (no-ops otherwise), but no feature calls it for reset/verification | Reset & verification blocked by missing flows (and SMTP config where absent), not by the service | 🔴 (pairs with #1) |
| 3 | **Email/phone verification loop** | Registration sets `IsActive=true` immediately (`AuthService.cs`) | Fake-account friction is zero; weakens trust rails | 🟠 |
| 4 | **2FA / MFA** | No TOTP/SMS/WebAuthn code | Admin accounts especially exposed | 🟠 (admins first) |
| 5 | **Distributed rate-limit/lockout state** | `LoginLockoutStore` = in-memory `ConcurrentDictionary`; limiters = default in-memory | Autoscaling multiplies attacker budget; restarts reset counters | 🟠 (blocks scale-out) |
| 6 | **Security audit trail** | No audit log beyond `ILogger` | Incident forensics ~impossible | 🟠 |
| 7 | **CSRF anti-forgery layer** | None; mitigated by bearer-header pattern + SameSite on `/api/auth` cookies | Residual risk small | 🟢-ok |
| 8 | **SRI on third-party scripts** | Analytics vendors serve mutable URLs; SRI unsupported | Accepted, remediated-by-design | 🟢-ok |

## B. Verified NOT implemented — engineering quality

| # | Gap | Evidence | Impact | Priority |
|---|---|---|---|---|
| 9 | **Backend test coverage beyond lockout** | Exactly 3 test files, all for `LoginLockoutFilter/Store`; zero tests for billing, subscriptions, quotas, bookings, matching, RBAC, controllers | Money-touching logic changes are unverified | 🔴 |
| 10 | **Frontend tests** | No jest/vitest/playwright config anywhere | UI regressions found by users | 🟠 |
| 11 | **CI quality gates** | Only deploy workflows exist (`deploy-backend.yml` active; `fly-deploy.yml` disabled); no build/test/lint workflow | Broken code can deploy | 🔴 (cheap to fix) |
| 12 | **Type-checked frontend builds** | `typescript.ignoreBuildErrors: true` in `next.config.ts` | Compile errors become runtime errors | 🔴 (cheap to fix) |
| 13 | **Optimistic concurrency** | No `RowVersion`/concurrency token in any entity | Two admins editing plans/settings = silent lost updates | 🟠 |
| 14 | **Observability** | No Sentry/APM/uptime/alerting; no `/version` endpoint | Slow incident response; deployment-drift blindness | 🟠 |

## C. Structural debt (present but strained)

| # | Item | Evidence | Recommendation 🟡 |
|---|---|---|---|
| 15 | God service | `AdminService.cs` > 2000 lines | Split along admin use-case lines before next admin feature |
| 16 | JSON-in-TEXT entitlements | `Property.Features` queried via `LIKE '%featured_listings%'` | Migrate to `jsonb` + GIN index, or a proper join table |
| 17 | Soft-delete filters are opt-in | Global query filters applied per-configuration, not systematically | Loop over `ISoftDeletable` types in `OnModelCreating` |
| 18 | Outdated docs | `boioot/README.md` claims SQL Server & "no code yet"; `PORTABILITY.md` dated 2023 | Update or delete; stale docs are worse than none |
| 19 | Growing boot-patch file | `DatabaseStartupService` accumulates every patch forever | Adopt numbered patch registry with an applied-patches table |

## D. Explicitly acceptable as-is (🟢-ok, with reasoning)

- **No i18n framework** — single-language Arabic product by design; add only when a second locale is planned.
- **No React Query/Redux** — context + custom fetch wrapper matches current complexity.
- **No microservices/queue/broker** — one team, one product; the modular monolith is the correct stage.
- **Manual payment-proof billing** — not a gap; it is the market-appropriate design (SYP rails).
- **Offset pagination** — fine at current data volume.

## Suggested sequencing (🟡 recommendation, not a work order)

1. **Week-one wins**: CI build+test+typecheck (#11), remove `ignoreBuildErrors` (#12), `/version` endpoint (#14-part).
2. **Account lifecycle**: real email provider (#2) → password reset (#1) → email verification (#3).
3. **Money safety net**: characterization tests around subscriptions/quotas/billing (#9) *before* the next commerce change.
4. **Scale prerequisites** (before instance count >1): Redis-backed lockout/limits (#5), concurrency tokens on admin entities (#13).
5. **Hardening**: admin MFA (#4), audit trail (#6), AdminService split (#15).

---

## Advantages & limitations of this register approach

| Advantages 🔵 | Limitations 🔵 |
|---|---|
| Absence becomes explicit, searchable information; priorities are argued, not implied | A register is a snapshot — it silently rots unless re-verified after each major feature |
| Separates market-appropriate designs (🟢-ok) from real debt, preventing cargo-cult "fixes" | Priority labels reflect today's stage; a stage change (scale-out, second admin, regulation) re-ranks everything |

## Lessons learned

1. **Gaps cluster around flows, not files** — "auth" looks done because login is sophisticated, but the account *lifecycle* (reset/verify) is absent. Audit by user journey, not by folder.
2. **The cheapest fixes are often process, not code** — items #11/#12 are configuration-level and eliminate whole error classes.
3. **A frontend page implies nothing about the backend** — `/forgot-password` renders perfectly against an endpoint that does not exist.

## Common mistakes

- Reading a rich feature list as evidence of completeness.
- Prioritizing new features over the reset-flow class of gaps because "no one complained yet".
- Letting stale README claims (wrong DB engine!) mislead future contributors.

## Best practices

- Maintain a living NOT-implemented register (this file) — absence is information.
- Sequence hardening by blast radius: money > accounts > admin > polish.
- Re-verify this register after every major feature; gaps close and open.

## Rules to remember

- **"Not implemented" must be written down, or it will be assumed implemented.**
- **Test coverage should follow money and irreversibility, not ease of testing.**
- **Every gap gets a priority and a reason — an unranked list is a guilt list.**

## Checklist for future projects

- [ ] Keep a gaps register from the first sprint
- [ ] Audit auth as a lifecycle (register→verify→login→reset→revoke→delete)
- [ ] CI gates before deploy automation, always
- [ ] Grep for "ignore*Errors" flags before every launch
- [ ] Re-rank the register quarterly; promote 🟢-ok items when stage changes
