# 02 · Backend Guide

## Topic A — Startup, DI, and configuration

### 1. What exists in Boioot 🟢

- `Boioot.Api/Program.cs` stays thin by delegating registration to one extension method: `AddInfrastructure(...)` in `Boioot.Infrastructure/Extensions/ServiceCollectionExtensions.cs`. Nearly all services are **Scoped** (one instance per HTTP request — matches DbContext lifetime).
- Configuration layering: `appsettings.json` → `appsettings.{Environment}.json` → environment variables. Secrets are env-vars only:
  - `JWT_KEY` (falls back to `Jwt:Key` for dev)
  - `DATABASE_URL` — parsed into an Npgsql connection string inside `ServiceCollectionExtensions.cs`
  - `PORT` — assigned by the host platform
  - R2 credentials (absence triggers local-disk storage fallback), `GA4_*`
- Validation errors are reshaped in `Program.cs` into a JSON object keyed by field name (consistent error contract for the frontend).

### 2. Why this approach

- One `AddInfrastructure` entry point means the Api project never references concrete implementations directly — the composition root is a single, reviewable file.
- Env-var secrets are the twelve-factor norm and match all three runtime hosts Boioot uses (Fly.io secrets, Vercel env, Replit secrets).
- Scoped lifetime is the safe default with EF Core: DbContext is not thread-safe and must not outlive a request.

### 3. Modern alternatives

- **Options pattern everywhere** (`IOptions<JwtOptions>` bound + validated with `ValidateDataAnnotations().ValidateOnStart()`), instead of reading `IConfiguration` ad hoc.
- **Secret managers** (Azure Key Vault, AWS Secrets Manager, Doppler, Infisical) with rotation instead of static env vars.
- **Startup validation**: fail fast at boot if a required setting is missing, rather than at first use.

### 4. When to use each

- Env vars: fine up to the point where secrets need rotation, audit, or many services share them — then a secret manager.
- 🔵 **Best practice**: strongly-typed options with `ValidateOnStart` in any app with >5 config values; a missing setting should kill boot, not a 3 a.m. request.

---

## Topic B — Database schema management (the unconventional part)

### 1. What exists in Boioot 🟢

`Boioot.Infrastructure/Persistence/DatabaseStartupService.cs` — a hosted service that runs at boot and owns the schema:

- **Fresh database**: `EnsureCreatedAsync()` for PostgreSQL (then baselines the migration-history table); `MigrateAsync()` path for SQLite/SQL Server.
- **Evolution**: *not* EF migrations. Idempotent raw-SQL patches via `ExecuteSqlRawAsync`, guarded by checks against `information_schema.columns` / `sqlite_master` (e.g. `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).
- Provider-specific fixes are applied the same way (widening `varchar(500)`→`text`, converting text dates → `timestamptz`).
- Reference-number sequences (`PREFIX-YEAR-NNNNNN`) are created as native PG sequences here too (see chapter 04).
- Multi-provider support: PostgreSQL (prod/dev), SQLite (portable/local), SQL Server (documented in `boioot/apps/backend/PORTABILITY.md`).

### 2. Why this approach

- EF migrations generate provider-specific SQL at design time; supporting **three providers from one migration chain** is painful. Hand-written idempotent SQL sidesteps that.
- Boot-time self-patching means deploys never require a separate "run migrations" step — important for autoscale platforms where any instance may start first.
- Idempotency makes the patches safe to run on every boot and on every instance.

### 3. Modern alternatives

| Approach | Tools |
|---|---|
| ORM migrations | EF Core migrations, Alembic, Prisma Migrate, Django |
| Versioned SQL runners | Flyway, Liquibase, dbmate, golang-migrate |
| Declarative diffing | Atlas, pgroll, Prisma db push |
| Manual DBA change control | Regulated/enterprise environments |

### 4. When to use each

- **Boioot's model** works when: one small team, additive-only changes, boot-time patching acceptable, multi-provider portability desired. Its weaknesses: no ordered history, no down-migrations, patch list grows forever, and a failed patch blocks boot.
- **EF migrations**: single provider, team wants generated diffs + tooling. The default for most .NET teams.
- **Flyway/Liquibase-style**: multiple apps touching one DB, or DBAs in the loop — the versioned-SQL ledger *is* the audit trail.
- 🔵 **Best practice** regardless of tool: schema changes must be **backward-compatible for one deploy cycle** (expand → migrate data → contract), because old and new code overlap during rollout.

---

## Topic C — Service & controller conventions

### 1. What exists in Boioot 🟢

- `BaseController` (`Boioot.Api/Controllers/BaseController.cs`): `[ApiController]`, helpers like `GetUserId()` that throw a 401-mapped `BoiootException` when claims are missing.
- Constructor injection everywhere; controllers call one service, return `Ok/NotFound/BadRequest`.
- Errors flow through `BoiootException` → global exception handler → consistent JSON (plan-limit violations get their own shape).
- Pagination contract: `PagedResult<T>` (`Boioot.Application/Common/Models/PagedResult.cs`) → serialized camelCase as `{ items, page, pageSize, totalCount, totalPages, hasNext, hasPrevious }` — used uniformly by list endpoints.
- List-query patterns in services (e.g. `PropertyService.GetPublicListAsync`): `AsNoTracking()`, filtered `Include`s (cover image only), server-side status filtering (`Available` + `ModerationStatus.Active`), batch enrichment to avoid N+1 (`EnrichWithRatingSummaryAsync` fetches all rating summaries in one query).
- Description truncation for list cards happens server-side (150 chars) so payloads stay small.

### 2. Why this approach

- A single paged envelope means the frontend writes one pagination component, ever.
- `AsNoTracking` + projection keeps read endpoints cheap; EF change tracking is pure overhead for GETs.
- Server-side visibility filtering is a **security decision**, not a convenience: the client can never opt out of moderation rules (this is what made the public sitemap safe to build on `/api/properties`).

### 3. Modern alternatives

- **MediatR handlers** instead of fat services; controllers become 3-liners.
- **FluentValidation** instead of DataAnnotations (Boioot uses DataAnnotations + manual checks; FluentValidation is **not present**).
- **ProblemDetails (RFC 7807)** for error responses instead of custom JSON.
- **Cursor (keyset) pagination** instead of offset pagination for large/fast-moving lists.
- **OData/GraphQL** for client-driven querying.

### 4. When to use each

- Offset pagination (Boioot's) is fine below ~100k rows per filtered view; switch to keyset when deep pages get slow or items shift between pages.
- ProblemDetails is worth adopting when third parties consume your API; internal-only APIs can keep a custom contract if it's consistent.
- 🟡 **Recommendation**: split the largest services (`AdminService.cs` >2000 lines, `BlogService.cs`, `PropertyService.cs`) along use-case lines before they become change bottlenecks.

---

## Topic D — Feature-module map (what the product is, in code)

### 1. What exists in Boioot 🟢 (all under `Boioot.Infrastructure/Features/`)

**Listings**
- `Properties/PropertyService.cs` — lifecycle (`Available/Inactive/Sold/Rented`), moderation gate, featured placement via a `Features` JSON column (`featured_listings` floats to top of public lists), trial-listing quotas.
- `Projects/ProjectService.cs` — developer projects, gated by `max_projects` plan limit.
- `BuyerRequests/` — reverse listings ("wanted" ads) matched to agents.
- `Bookings/BookingService.cs` — daily rentals: `ListingType == "DailyRent"` ⇒ auto `IsBookable`; owner approves before payment (manual booking workflow).

**Commerce**
- `Plans/` + `Pricing/` — plan catalog with `Rank` (upgrade/downgrade ordering), dual currency (SYP/USD), `BillingMode`: `InternalOnly` / `StripeOnly` / `Hybrid`.
- `Subscriptions/SubscriptionService.cs` — `Trial/Active/Pending/PastDue/Expired/Cancelled`; stale subscriptions auto-detected on read; feature gating via `IPlanEntitlementService`.
- `Billing/BillingService.cs` — invoices; **manual payment-proof flow**: user uploads a receipt image, admin confirms (`AdminConfirmPaymentAsync`). `StripeBillingProvider.cs` for card payments.
- `LeadUnlocks/` — pay/entitlement-gated access to lead contact details.
- Quota logic: usage computed as count of entities created since `CurrentPeriodStart` — and deliberately ignores `IsDeleted`, so deleting an ad does **not** refund quota (`PropertyService.cs`, commented).

**Trust**
- `VerificationRequests/` — Draft → Pending → Approved/Rejected with document uploads and an embedded clarification thread (`ConversationJson`).
- `Ratings/RatingService.cs` — reviews for properties/projects/agents (`ReviewTargetType`), averages enriched into list responses.

**Engagement**
- `Messaging/MessagingService.cs` — internal chat, gated by `internal_chat` plan feature; `Support`/`Admin` conversation types bypass plan limits so users can always reach the platform.
- `Matching/RequestMatchingService.cs` — scores agents against buyer requests by coverage overlap (50 = province match … 100 = neighborhood match).
- `Coverage/`, `Favorites/`, `Notifications/` (+ SignalR hub for realtime).

**Content & Admin**
- `Blog/BlogService.cs` — SEO title/description with template auto-generation modes (`{PostTitle} | {SiteName}`), slugs, publish states.
- `Pages/`, `SiteSettings/`, `Integrations/` (analytics pixel config served to the frontend).
- `Admin/AdminService.cs` — back-office engine: customer directory, agent performance, overrides. `Onboarding/` — registration → functional account.

### 2. Why this approach

The module set is the textbook two-sided-marketplace playbook: supply (listings) + demand (requests) + a matching engine + trust rails (verification/ratings) + monetization on the supply side (subscriptions/quotas/lead unlocks). Manual payment proof exists because card rails are unreliable in the target market — a *market* constraint driving architecture.

### 3. Modern alternatives / 4. When to use each

- Entitlement checks could come from a dedicated feature-flag/entitlement service (LaunchDarkly, Stigg, homegrown) — worth it when plans change weekly; overkill here.
- Matching could be search-engine-driven (Elasticsearch/pgvector) — appropriate at higher volume; Boioot's SQL scoring is simple and debuggable at current scale.
- Manual-approval payment flows generalize to any market with weak card rails or any B2B invoice workflow — keep the pattern in your toolbox (see chapter 08).

---

## Advantages & limitations of Boioot's choices

| Topic | Advantages 🟢 | Limitations 🟢 |
|---|---|---|
| Single composition root + env-var config | One reviewable wiring file; portable across Fly/Vercel/Replit secrets | No startup validation — a missing setting fails at first use, not at boot; no typed options |
| Boot-time idempotent SQL patches | Zero-step deploys; multi-provider (PG/SQLite/SQL Server); safe on any instance | No ordered history or down-migrations; patch file grows forever; a failed patch blocks boot; schema truth lives in C#, not in versioned SQL |
| Thin controllers + fat services | Uniform error/pagination contracts; HTTP-free business logic | Largest services became change bottlenecks; no use-case-level isolation (a vertical-slice strength) |
| Feature-folder modules | Folder tree documents the product; low coupling between business areas | Shared concerns (entitlements, quotas) cut across folders and must stay centralized by discipline |

## Lessons learned

1. **Quota semantics need explicit decisions**: Boioot deliberately keeps consumed quota after deletion — otherwise delete/recreate becomes an infinite-listing exploit. The comment in code is the documentation.
2. **Boot-time idempotent patches trade history for autonomy.** It works, but every schema fact lives only in one growing C# file — verify against `information_schema`, never assume.
3. **Support channels must bypass monetization gates** (Boioot's `Support` conversations ignore chat limits) — never let a paywall block a user from reaching you.
4. **Reference numbers via PG sequences** (not `COUNT+1`) was learned the hard way here: soft-deletes made count-based numbers collide (unique-violation 23505).

## Common mistakes

- Computing "next number" with `COUNT()`/`MAX()+1` under concurrency or soft-deletes.
- Returning EF entities directly from controllers (Boioot correctly maps to DTOs/responses).
- N+1 queries from lazy enrichment in list endpoints — batch instead.
- Letting one "god service" absorb every admin feature until no one can change it safely.

## Best practices

- One composition root; scoped lifetime with EF Core.
- Idempotent, guarded schema changes — whatever the migration tool.
- Uniform pagination envelope and uniform error JSON across the whole API.
- Read paths: `AsNoTracking`, filtered includes, server-side authorization filters.

## Rules to remember

- **Visibility filtering is authorization** — it belongs on the server, in every query, not in the client.
- **Schema changes must survive being run twice.**
- **Every quota needs an answer to: what happens on delete?**
- **DTO in, DTO out; entities never cross the API boundary.**

## Checklist for future projects

- [ ] Composition root extension method; no `new` for services
- [ ] Typed options + validate-on-start for config
- [ ] Choose a migration strategy and write down its rollback story
- [ ] Standard paged envelope + standard error shape before endpoint #2
- [ ] `AsNoTracking` on all read paths; batch enrichment queries
- [ ] Decide quota/delete semantics explicitly and write the reason in code
- [ ] Cap service file size; split by use case before 1000 lines
