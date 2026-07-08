# 04 · Data Model

## Topic A — Entity map

### 1. What exists in Boioot 🟢 (`Boioot.Domain/Entities/`)

**Identity**
- `User` — core actor: `UserCode` (human-readable ID), `Email` (unique), `Role` (`UserRole`), `IsActive`, `VerificationStatus`/`VerificationLevel`, `TrialListingsUsed`, `PasswordHash` (BCrypt).
- `Company` — office or developer: `CompanyType` (`"RealEstateOffice"` / `"DeveloperCompany"`), `IsVerified`, `IsProfileComplete`, geo fields.
- `Agent` — staff member: links `User` ↔ `Company`. `AgencyProfile` — extended broker/office profile.

**Listings**
- `Property` — the central entity: `Status` (`PropertyStatus`), `ModerationStatus`, `Type`, `ListingType` (string: `"Sale"/"Rent"/"DailyRent"`), `Price`+`Currency`, `IsBookable`, `Features` (JSON-in-TEXT, e.g. `featured_listings`), `OwnerId` (personal listings) or `CompanyId`, `IsDeleted`.
- `Project` — developments: `ProjectStatus`, `IsPublished`, `DeliveryDate`. `PropertyImage`/`ProjectImage` — media, with `UserImage` bridge preferring R2 URLs.

**Demand & transactions**
- `BuyerRequest` — "wanted" ads: `PropertyType`, location IDs, `Status`, `ReferenceNumber`.
- `Booking` — daily rentals: date range, `Status` (`PendingApproval`…), `TotalAmount`, `PaymentStatus`. `Request` — inquiry/lead on a property/project. `Review` — target-typed ratings.

**Commerce**
- `Plan` — `Code`, `AudienceType`, `Tier`, `Rank`, `ListingLimit`, `PlanBillingType` (`recurring` / `one_time_fixed_term`), `ConsumptionPolicy`, `BillingMode` (`InternalOnly`/`StripeOnly`/`Hybrid`).
- `Subscription` — `Status`, period dates, `ListingQuotaUsed`, `SubscriptionNumber`. `Invoice`, `PaymentProof` (uploaded receipt for manual approval).

**Engagement & content**
- `Conversation`/`Message` (P2P chat, optional property/project anchor), `Notification`, `UserCoverage` (matching areas), `BlogPost` (+SEO modes), `StaticPage`, `SiteSettings`, `VerificationRequest` (+`VerificationDocument`, `ConversationJson` clarification thread).
- RBAC: `RbacRole`, `RbacPermission`, `RbacRolePermission`, `RbacUserRole` — **verified wired into auth**: permissions resolved at login (`AuthService.ResolvePermissionsAsync`) and embedded as JWT claims, enforced by `[RequirePermission]` across 9 admin controllers (e.g. `AdminController.cs` 48 usages, `AdminBlogController.cs` 16).

### 2. Why this model

- One `Property` table with `ListingType` as a discriminator (instead of separate Sale/Rent/DailyRent tables) keeps search, moderation, quotas, and media uniform — variants differ by *behavior flags* (`IsBookable`), not by schema.
- Dual ownership (`OwnerId` vs `CompanyId`) models the two supply sides (individuals vs agencies) without duplicating the listing pipeline.
- `Features` as a JSON string is a pragmatic entitlement bag — cheap to extend, at the cost of type safety and indexed querying (`LIKE '%featured_listings%'` in queries).

### 3. Modern alternatives

- **Table-per-type inheritance** for listing variants; **jsonb columns** (indexed, queryable) instead of JSON-in-TEXT; **value objects** for money (`Price`+`Currency` as one concept); **separate read models** for public search.

### 4. When to use each

- Discriminator-in-one-table: default for variants sharing 80%+ of fields.
- Real `jsonb`: as soon as you *query* into the JSON (Boioot already does with `LIKE` — a 🟡 recommendation candidate).
- Money value objects / integer minor-units: mandatory in FinTech; advisable anywhere multi-currency arithmetic happens (see chapter 08).

---

## Topic B — Conventions: keys, audit, soft delete, reference numbers

### 1. What exists in Boioot 🟢

- **GUID primary keys** everywhere via `BaseEntity` (`Id`, `CreatedAt`, `UpdatedAt`); audit fields auto-set in `BoiootDbContext.SetAuditFields()` on `SaveChangesAsync`. SQLite compatibility: GUIDs stored as TEXT (`ConfigureConventions`).
- **Soft delete**: `bool IsDeleted` + **global query filters** on core entities — some composite (Property's filter also checks `!Company.IsDeleted`). Applied per-entity-configuration, *not* by a global loop — smaller entities may lack it.
- **Human-readable reference numbers**: `PREFIX-YEAR-NNNNNN` (e.g. `SUB-2026-000123`) generated from **per-(prefix, year) PostgreSQL sequences via `nextval`** — created idempotently at startup. Never `COUNT()`/`MAX()+1`: soft-deleted rows made count-based numbering collide (unique violation 23505) earlier in this project's history.
- **Not present** (verified): optimistic concurrency (`RowVersion`/`IsConcurrencyToken`) — nowhere in the domain; value objects — model is primitives-only.

### 2. Why this approach

- GUIDs: safe generation on any instance without coordination; no ID guessing.
- Global query filters make "deleted is invisible" the default instead of a per-query chore — one forgotten `Where(!IsDeleted)` is a data leak.
- Sequences are the *only* concurrency-safe, gap-tolerant way to issue sequential business numbers; the year in the prefix gives humans context and resets the counter annually.

### 3. Modern alternatives

- **UUIDv7 / ULID** — time-ordered GUIDs that fix B-tree index locality (random GUIDv4 fragments indexes).
- **Snowflake IDs** (int64, time-ordered) for high-write systems.
- **Hard delete + audit/history table**, or **temporal tables**, instead of soft delete — required where "right to erasure" (GDPR) applies.
- **`xmin`-based or RowVersion optimistic concurrency** for lost-update protection.

### 4. When to use each

- UUIDv7/ULID: choose it for any *new* PG-backed system — same benefits as GUIDv4 without index churn.
- Soft delete: right when data participates in quotas/history/moderation (Boioot's case). Hard delete + tombstone audit: right for PII under privacy law.
- Optimistic concurrency: add wherever two humans can edit the same row (admin panels!) — 🟡 recommended for Boioot's admin-editable entities (plans, site settings, pages).

---

## Topic C — EF Core configuration & querying

### 1. What exists in Boioot 🟢

- `ApplyConfigurationsFromAssembly` with per-entity config classes in `Boioot.Infrastructure/Persistence/Configurations/`.
- Deliberate indexes on hot paths (`PropertyConfiguration`): composite `{Status, CreatedAt}`, `{CompanyId, Status, CreatedAt}`, `{OwnerId, CreatedAt}`; unique on `User.Email`, `User.UserCode`.
- Query style: `AsNoTracking` reads, filtered `Include`s (cover images only), pagination clamped server-side (`Math.Clamp(pageSize, 1, 50)`), batch enrichment instead of N+1 (single `ANY(@ids)` queries for ratings/verification badges).

### 2. Why this approach

- Index shapes mirror the actual public queries (filter by status, order by created-at) — indexes designed from queries, not from instinct.
- Server-side pageSize clamps make the API self-defending against `?pageSize=100000`.

### 3. Modern alternatives

- Dapper/raw SQL for hot read paths; compiled EF queries; `AsSplitQuery` for wide includes; read replicas; materialized views for aggregates.

### 4. When to use each

- Stay with EF until a *measured* hot path says otherwise; then drop to SQL for that one query.
- `AsSplitQuery` when a multi-`Include` query explodes row counts (cartesian product) — a candidate for Boioot's blog list (post × author × categories).

---

## Advantages & limitations of Boioot's choices

| Topic | Advantages 🟢 | Limitations 🟢 |
|---|---|---|
| Single `Property` table + discriminator | One pipeline for search/moderation/quotas/media across Sale/Rent/DailyRent | Variant-specific fields all live on one wide row; behavior flags (`IsBookable`) must stay consistent with `ListingType` by code discipline |
| GUIDv4 keys + `BaseEntity` audit | Coordination-free ID generation; uniform audit fields set in one place | Random GUIDs fragment B-tree indexes at scale (UUIDv7 fixes this); no `DeletedAt/DeletedBy` on soft deletes |
| Soft delete + global query filters | "Deleted is invisible" by default; history preserved for quotas/moderation | Opt-in per configuration — smaller entities may lack filters; deleted rows still hit unique indexes; filters invisible when debugging |
| Sequence-backed reference numbers | Concurrency-safe; human-readable; year-scoped | Requires provider-specific setup (PG sequences); numbers gap on rollback (acceptable, but surprises auditors who expect gapless) |
| JSON-in-TEXT `Features` | Extend entitlements without migrations | Not indexed or type-safe; queried with `LIKE` — both a performance and correctness risk |

## Lessons learned

1. **Number generation is a concurrency problem, not a formatting problem.** The `COUNT+1` → sequence migration in this codebase is the canonical example.
2. **Soft delete changes the meaning of every other query** — quotas, uniqueness, numbering, sitemap visibility all had to answer "does deleted count?" explicitly.
3. **Filters that live in EF configuration are invisible in service code** — powerful, but you must remember they exist when debugging "missing" rows (`IgnoreQueryFilters` for admin views).
4. **Multi-provider portability costs schema precision** — TEXT GUIDs, string enums, JSON-in-TEXT all trace back to keeping SQLite/SQL Server compatibility.

## Common mistakes

- Random GUIDv4 as clustered/primary index key at scale (index fragmentation).
- Soft delete without global filters (leaks) or without deciding quota semantics (exploits).
- Storing queryable data as opaque JSON strings, then querying with `LIKE`.
- No concurrency tokens on admin-edited configuration rows.

## Best practices

- `BaseEntity` with auto-audit fields set in one place (`SaveChangesAsync` override).
- Global query filters for soft delete, applied *systematically* (loop over entity types implementing `ISoftDeletable`, not per-config opt-in).
- Indexes derived from real query shapes; unique constraints on every natural key.
- Clamp all client-supplied paging/filtering inputs at the boundary.

## Rules to remember

- **Business identifiers come from sequences; surrogate keys from UUIDs.**
- **Every soft-deleted row must have an answer for: uniqueness? quota? visibility?**
- **The schema serves today's queries — index what you filter and sort.**
- **Concurrency control is required wherever two admins share one edit screen.**

## Checklist for future projects

- [ ] UUIDv7/ULID keys + `BaseEntity` audit fields from the first table
- [ ] Soft-delete decision per entity, with global filters if yes
- [ ] Sequence-backed reference numbers for anything customer-facing
- [ ] Unique constraints on all natural keys (email, codes, slugs)
- [ ] Composite indexes matching the top 5 list queries
- [ ] Concurrency tokens on admin-editable rows
- [ ] jsonb (not TEXT) for any JSON you will ever query
