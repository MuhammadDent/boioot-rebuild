# 10 · Software Design Patterns

> Patterns **actually present in Boioot** (🟢, with file citations), followed by
> patterns **deliberately absent** (🔵/🟡) with guidance on when they earn their
> complexity. No invented implementations.

## Part 1 — Patterns implemented in Boioot 🟢

### Structural

| Pattern | Where in Boioot | What it solves | Use again when |
|---|---|---|---|
| **Layered / Clean Architecture** | 4 projects, inward dependencies (`src/Boioot.*`) | Business logic isolated from delivery/persistence | Any app expected to outlive its first framework choice |
| **Composition Root** | `AddInfrastructure()` in `Infrastructure/Extensions/ServiceCollectionExtensions.cs` | All wiring in one reviewable place | Always, in DI-based apps |
| **Feature Folders (package-by-feature)** | `Infrastructure/Features/{Properties,Billing,…}` | Code discoverability by business capability | Always, once >~5 features |
| **Base Entity (layer supertype)** | `BaseEntity` (Id/CreatedAt/UpdatedAt) + `SetAuditFields()` in `BoiootDbContext` | Uniform identity + audit without repetition | Always with an ORM |
| **BFF-ish Proxy (same-origin gateway)** | Next rewrites `/api → BACKEND_URL` (`next.config.ts`) | Kills CORS; one browser-facing header policy | Web UI + separate API, single product |

### Behavioral

| Pattern | Where in Boioot | What it solves | Use again when |
|---|---|---|---|
| **Strategy (pluggable providers)** | `BillingMode: InternalOnly/StripeOnly/Hybrid` with `StripeBillingProvider.cs` vs manual-proof path; `R2FileStorageService` vs `LocalFileStorageService` fallback | Swappable rails behind one interface | Multiple interchangeable implementations of one capability |
| **State Machine (status-driven workflow)** | Subscriptions (`Trial/Active/Pending/PastDue/Expired/Cancelled`), verification (`Draft→Pending→Approved/Rejected`), bookings (`PendingApproval→…`) | Legal transitions made explicit; illegal ones impossible-by-code | Any entity with a lifecycle — i.e., almost every business entity |
| **Intercepting Filter** | `LoginLockoutFilter` (pre-auth `IAsyncActionFilter` short-circuiting before credentials) | Cross-cutting check before expensive work | Endpoint-specific guards that must run before the handler |
| **Policy Provider / Handler (extensible authorization)** | `PermissionPolicyProvider` + `PermissionAuthorizationHandler` + `[RequirePermission]` (`Boioot.Api/Authorization/`) | Open-ended permission set without one policy per registration | Dynamic, DB-defined permissions |
| **Template-with-override** | Blog SEO modes: auto-template `{PostTitle} | {SiteName}` unless manually overridden (`BlogService.cs`) | Sane defaults + explicit escape hatch | Any generated-but-editable content |
| **Two-Phase Commit-ish Upload (presign → finalize)** | `/api/images/direct-upload-url` → pending prefix → finalize verify/re-encode | Large payloads bypass the API but control returns to it | All user file uploads |
| **Token Rotation with Family Revocation** | `AuthService.RefreshAsync` | Contains stolen-refresh replay | Any self-managed refresh tokens — non-negotiable |

### Data access

| Pattern | Where in Boioot | What it solves | Use again when |
|---|---|---|---|
| **Global Query Filter (implicit predicate)** | Soft-delete filters in EF configurations (some composite: `!p.IsDeleted && !p.Company.IsDeleted`) | "Deleted is invisible" as default | Soft-delete, multi-tenancy (`TenantId` filters) |
| **Batch Enrichment (anti-N+1)** | `EnrichWithRatingSummaryAsync` etc. — one `ANY(@ids)` query per concern per page | List endpoints stay O(queries)=constant | Any list needing per-row aggregates |
| **Result Envelope** | `PagedResult<T>` (`Application/Common/Models/`) | One pagination contract everywhere | Always |
| **Idempotent Boot Patches** | `DatabaseStartupService` guarded raw SQL | Self-provisioning instances | Automated schema work of any kind |
| **Sequence-backed Identifier** | Per-(prefix,year) PG sequences | Race-free human-readable numbers | Invoices, orders, tickets, cases |

### Domain/product mechanics (named in ch. 08-KB, cited there)
Evidence-approval flow (P4) · dual-status visibility (P5) · clarification-loop review (P6) · declared-attribute matching (P7) · centralized entitlement gate (P3).

## Part 2 — Patterns deliberately ABSENT from Boioot (verified, ch. 07)

| Pattern | Status | When it earns its complexity |
|---|---|---|
| **Repository + Unit of Work** | 🔵 No broad repository abstraction — services query `BoiootDbContext` directly. (One narrow exception exists: `Features/Rbac/RbacRepository.cs`, injected by `AuthService` for permission resolution) | EF's DbContext *is* both patterns; add explicit repositories only for swap-able persistence or heavy test doubles. Usually skip. |
| **CQRS / MediatR** | 🔵 Not used | Read and write models diverge materially, or vertical slices are adopted. Not before. |
| **Domain Events / Event Sourcing** | 🔵 Not used | Audit-as-truth requirements (FinTech ledgers) or genuinely event-driven domains. High cost — default no. |
| **Outbox / message broker** | 🔵 Not used (no queue at all) | The first business-critical side effect that must survive a crash mid-request (e.g., "payment confirmed ⇒ must notify"). Boioot's SignalR notify is best-effort today. |
| **Saga / process manager** | 🔵 Not used | Multi-service transactions. Irrelevant in a monolith. |
| **Value Objects** | 🟡 Not used (primitive obsession noted in ch. 04) | Money, date ranges, and addresses justify them even in Boioot-scale apps — first candidates: `(Price, Currency)`, booking date ranges. |
| **Optimistic Concurrency Token** | 🟡 Not used | Two admins, one edit screen — already true in Boioot's back-office (ch. 07 #13). |
| **Circuit Breaker / Retry (Polly)** | 🔵 Not used | First flaky external dependency on a hot path (Stripe, R2 already qualify as candidates). |

## Part 3 — Pattern-selection heuristics

1. **Pick patterns by problem shape, not by résumé value** — every 🟢 pattern above was pulled in by a concrete failure or requirement.
2. **The absent list is as instructive as the present list**: Boioot ships real revenue features without CQRS, brokers, or repositories — absence of ceremony is a feature until a trigger fires.
3. Each absent pattern has a *trigger condition* (column 3). Write the trigger in your docs; adopt the pattern the day it fires, not before.

---

## Lessons learned
- The most-used patterns here are the humblest: envelopes, filters, sequences, state machines. Master those before the distributed exotica.
- Strategy + state machine covers a remarkable share of business complexity (billing rails, subscription lifecycles, review workflows).

## Common mistakes
- Wrapping EF in hand-rolled repositories "for testability" and losing `Include`/query power for nothing.
- Adopting CQRS/events because a conference talk did — without the trigger condition.
- Building a state machine as scattered `if (status == …)` checks instead of an explicit transition table.

## Best practices
- Keep one file like this per organization: patterns *in use*, patterns *banned-until-trigger*, and the triggers.
- Cite real code for every pattern claim — a pattern catalog without addresses is folklore.

## Rules to remember
- **A pattern without a trigger condition is décor.**
- **DbContext is already a repository and a unit of work.**
- **Explicit state machines beat implicit status ifs — always.**

## Checklist for future projects
- [ ] List lifecycle entities; give each an explicit state machine on day one
- [ ] One Strategy interface per external rail (payments, storage, email)
- [ ] Envelope + global filters + batch enrichment from the first list endpoint
- [ ] Write trigger conditions for CQRS/outbox/value-objects into the project docs
- [ ] Review this catalog when adding any new architectural dependency
