# 08 · Engineering Knowledge Base

> Every pattern below was **extracted from working Boioot code** (source file
> cited), then generalized. This is the transferable layer — what carries into
> any SaaS, Marketplace, ERP, CRM, Healthcare, AI, FinTech, or Real-Estate
> system you build next.

## Part 1 — Universal patterns proven in Boioot

### P1. Sequence-backed business identifiers
**Source** 🟢: `DatabaseStartupService.cs` — per-(prefix, year) PG sequences; `PREFIX-YEAR-NNNNNN` via `nextval`.
**Generalized rule**: human-facing numbers (invoices, orders, tickets, patient IDs, case files) must come from an atomic counter owned by the database. `COUNT()+1` / `MAX()+1` breaks under concurrency and under soft-delete.
**Applies to**: ERP (document numbers), FinTech (transaction refs), Healthcare (accession numbers), CRM (case numbers). Everywhere.

### P2. Quota semantics are a contract, not an implementation detail
**Source** 🟢: `PropertyService.cs` — consumed listing quota is **not** refunded on delete (counted from `CurrentPeriodStart`, ignoring `IsDeleted`), with the reason commented in code.
**Generalized rule**: every metered resource needs written answers to: *counts when? refunds when? resets when? what stops gaming it?* Delete-and-recreate is the universal quota exploit.
**Applies to**: SaaS seats/credits, AI token budgets, ERP allocations, marketplace listing limits.

### P3. Entitlement gate as a single service
**Source** 🟢: `IPlanEntitlementService` + `SubscriptionService.cs` — one place answers "may this account use feature X / create another Y?"; support channels explicitly bypass gates (`MessagingService.cs`).
**Generalized rule**: centralize plan gating; scatter it and pricing changes become codebase-wide hunts. Always exempt the support path from paywalls.
**Applies to**: every subscription product; feature flags in general.

### P4. Manual-approval money flow
**Source** 🟢: `BillingService.cs` — invoice → user uploads `PaymentProof` → admin `AdminConfirmPaymentAsync` → subscription activates; Stripe as parallel rail (`BillingMode: InternalOnly/StripeOnly/Hybrid`).
**Generalized rule**: model payment as a *state machine with an evidence step*, and rails become pluggable. The same shape is: B2B invoice+remittance matching (ERP), claims adjudication (Healthcare/insurance), KYC-gated funding (FinTech), escrow release (marketplaces).
**Design invariant**: nothing user-visible activates until the *approval event*, never the *submission event*.

### P5. Moderation as a second, independent status axis
**Source** 🟢: `Property.Status` (owner-controlled: Available/Sold/Rented) × `ModerationStatus` (platform-controlled: Pending/Active/Rejected); public visibility requires both (`PropertyService.cs`).
**Generalized rule**: never merge "what the owner wants" and "what the platform allows" into one enum — they change for different reasons by different actors. Server-side filtering on the platform axis is authorization, not preference.
**Applies to**: marketplaces (listings), UGC (posts/reviews), CRM (data-quality approval), Healthcare (clinician sign-off on records).

### P6. Verification with an embedded clarification loop
**Source** 🟢: `VerificationRequestService.cs` — Draft→Pending→Approved/Rejected, documents attached, admin can request more info via an in-request conversation (`ConversationJson`).
**Generalized rule**: any human-review workflow needs a *return path* that doesn't reject-and-restart. Model it as: state machine + evidence attachments + threaded dialogue on the request itself.
**Applies to**: KYC/AML (FinTech), credentialing (Healthcare), vendor onboarding (ERP), seller verification (marketplaces).

### P7. Coverage-based matching with transparent scoring
**Source** 🟢: `RequestMatchingService.cs` — agents declare `UserCoverage` areas; buyer requests scored 50 (province) → 100 (neighborhood).
**Generalized rule**: start matching with explainable, monotonic rules on declared attributes. You can defend "why did I get this lead?" — something no black-box embedding gives you. Add ML ranking *on top* only when volume proves rules insufficient.
**Applies to**: lead routing (CRM), job/candidate matching, dispatch (logistics), referral routing (Healthcare).

### P8. Presigned upload + finalize-verify + re-encode
**Source** 🟢: images pipeline — presigned PUT to `pending-direct-uploads/{userId}/`, finalize verifies ownership + existence, ImageSharp re-encode → WebP, size cap, MIME allowlist.
**Generalized rule**: big bodies never transit your API; but the server must re-assert control at finalize (ownership, type, re-encode — which also strips EXIF/polyglots). Local disk is never the system of record on ephemeral hosts (verified failure mode in this project).
**Applies to**: everything with user files. In Healthcare add malware scanning + private buckets + signed GETs.

### P9. Refresh-token families with reuse detection
**Source** 🟢: `AuthService.RefreshAsync` — opaque tokens, SHA-256 at rest, rotation on use, family revocation on replay.
**Generalized rule**: this is the reference design for self-managed JWT auth. The equally important meta-lesson: auth is a lifecycle (verify→reset→revoke), and Boioot shows a strong core can coexist with missing lifecycle pieces — audit by journey.

### P10. Idempotent, self-applying schema patches
**Source** 🟢: `DatabaseStartupService.cs` — guarded raw SQL (`information_schema` checks), safe to run on every boot, on any instance.
**Generalized rule**: whatever migration tool you pick, two properties are non-negotiable: *idempotency* (safe to run twice) and *expand-migrate-contract* compatibility (old + new code overlap during deploys).

### P11. The proxy chain defines "client"
**Source** 🟢: lockout/limits keyed on left-most `X-Forwarded-For`; `UseForwardedHeaders` first; limiter after auth for per-user partitioning (`Program.cs`).
**Generalized rule**: any control keyed on "the client" (rate limit, lockout, geo, audit) is defined by header parsing behind CDNs — and its bugs are production-only. Test through the real chain.

### P12. Dual-currency pricing as first-class data
**Source** 🟢: `PlanPricing` rows carry SYP and USD variants; plans have `Rank` for upgrade ordering.
**Generalized rule**: price is a *(amount, currency, period)* record, never a bare decimal; plan comparability needs an explicit ordering field. For FinTech-grade arithmetic, store integer minor units and a currency code — never float.

## Part 2 — Domain application matrix

How the same Boioot patterns transfer, per domain:

| Domain | Directly reusable from Boioot | What you must ADD beyond Boioot |
|---|---|---|
| **SaaS** | P2 quotas, P3 entitlements, P9 auth, P12 plan ranks | Self-serve billing (webhooks as source of truth), org/team model, usage metering pipeline |
| **Marketplace** | P4 evidence-payments, P5 dual-status, P6 verification, P7 matching | Escrow/split payments, double-sided reviews with dispute flow, search infrastructure |
| **ERP** | P1 document numbers, P4 approval chains, P10 schema discipline | Double-entry ledger, period closing, multi-entity/multi-book, strict audit trail |
| **CRM** | P7 lead routing, P5 data-quality axis, coverage model | Activity timeline, dedupe/merge, pipeline stage engine, email/calendar sync |
| **Healthcare** | P6 credentialing, P8 uploads (+scanning), P5 sign-off axis | Compliance boundary (HIPAA-class): encryption at rest, access audit *log as legal record*, retention policies, BAAs; never localStorage tokens |
| **AI products** | P2 token/credit quotas, P3 gating, P11 abuse limits | Cost telemetry per request, model/version pinning + evals, prompt/output logging with PII policy, graceful degradation when provider fails |
| **FinTech** | P1 refs, P4 payment state machines, P9 auth + add MFA day one | Integer-minor-unit money, idempotency keys on every mutation, reconciliation jobs, immutable ledger, regulatory reporting |
| **Real Estate** | Nearly all of Boioot *is* the reference implementation | MLS/portal feeds, map/geo search (PostGIS), document e-sign, valuation data |

## Part 3 — The decision playbook (condensed from chapters 01–07)

1. **Topology**: proxied two-app (UI + API) is the default SaaS shape; split further only when team count forces it. (ch. 01)
2. **Layering**: one-directional dependencies enforced by project references; feature folders that scream the domain. (ch. 01/02)
3. **Data**: UUIDv7 surrogate keys + sequence business numbers; soft-delete only with global filters and written quota/uniqueness semantics; index from real queries. (ch. 04)
4. **AuthN/Z**: short access + rotating refresh; tiered central password policy; permissions-as-claims with a known staleness window; ship the whole lifecycle. (ch. 05)
5. **Abuse**: edge for volume, app for semantics; distributed state before instance #2. (ch. 05)
6. **Ops**: CI gates before deploy automation; `/health` + `/version`; object storage only; observability minimum = errors + uptime. (ch. 06)
7. **Honesty artifacts**: a living gaps register; "not implemented" written down. (ch. 07)

---

## Lessons learned

1. **Patterns transfer; parameters don't.** Boioot's manual payment proof is "wrong" for Stripe-land SaaS and exactly right for SYP rails — extract the state machine, re-derive the parameters from the market.
2. **The most reusable code is the most boring**: sequences, state machines, filters, envelopes. The clever parts (matching weights, plan tiers) are the least portable.
3. **Constraints are generators**: RTL-first, weak card rails, ephemeral disks, 8 GB build machines — each produced a design worth keeping. Enumerate constraints before architecture.
4. **Every domain column in the matrix is 80% the same platform** — identity, entitlements, evidence workflows, files, abuse control. Master these once; rent the last 20% from the domain.

## Common mistakes

- Copying an architecture without the constraints that justified it.
- Rebuilding identity/billing/uploads from scratch per project instead of carrying a personal reference (this handbook's purpose).
- Choosing tech for the domain's *glamorous* problem (AI matching!) before its *table-stakes* problem (verification workflow).

## Best practices

- Keep a personal pattern library keyed by *problem shape* (evidence-approval flow, dual-status visibility, metered resource) — not by framework.
- For each new project, write the constraint list first, then map patterns to it.
- Steal state machines liberally; re-price all thresholds, limits, and TTLs per context.

## Rules to remember

- **Extract the invariant, rebuild the parameters.**
- **Support paths bypass paywalls; approval events (not submissions) activate value; platform status trumps owner status.**
- **Money = integers + currency + idempotency keys. Always.**
- **If it's keyed on "the client", define "client" behind proxies first.**

## Checklist for starting any future project

- [ ] Write the constraint list (market, rails, team, hosting, language/direction)
- [ ] Pick topology by team structure; layering by dependency direction
- [ ] Day one: BaseEntity, sequences, paged envelope, error contract, `/health`, `/version`
- [ ] Auth lifecycle complete or bought — never login-only
- [ ] Entitlement service before the second gated feature
- [ ] Evidence-based state machines for any human-approval flow
- [ ] Object storage + finalize-verify for files
- [ ] CI gates, exception tracking, uptime probe before first real user
- [ ] Start the gaps register in sprint one
