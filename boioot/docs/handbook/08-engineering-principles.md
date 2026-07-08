# 08 · Engineering Principles

> Distilled principles, each anchored to verified Boioot evidence (🟢 with file
> path) or to industry practice (🔵). These are the *why* behind every rule in
> [09 · Master Engineering Rules](09-master-engineering-rules.md).

## I. Architecture principles

### 1. Dependencies point inward
🟢 Evidence: `Boioot.Domain` has zero project references; `Boioot.Api` → `Infrastructure` → `Application` → `Domain` (`boioot/apps/backend/src/*/*.csproj`).
**Principle**: business logic must never know about delivery mechanisms (HTTP, DB, UI). Enforce with project references — discipline decays, compiler errors don't.

### 2. Structure should scream the domain
🟢 Evidence: `Boioot.Infrastructure/Features/{Properties,Billing,Matching,…}` — the folder tree reads as a product description.
**Principle**: organize by business capability, not by technical kind (`controllers/`, `helpers/`). New contributors should learn the product from `ls`.

### 3. The proxy chain is part of the architecture
🟢 Evidence: left-most `X-Forwarded-For` for lockout keys; `UseForwardedHeaders` first in `Program.cs`; same-origin `/api` rewrites in `next.config.ts`.
**Principle**: IPs, headers, caching, and cookies are all *defined by the chain between user and app*. Design them per-hop; test them through the real chain.

### 4. Order is semantics
🟢 Evidence: `UseRateLimiter` after `UseAuthentication` — moved earlier, per-user partitioning silently degrades to per-IP (verified failure mode).
**Principle**: in pipelines (middleware, interceptors, CI stages), position *is* behavior. Document why each element sits where it does.

## II. Data principles

### 5. Concurrency-safe by construction, not by luck
🟢 Evidence: reference numbers from PG sequences via `nextval` (`DatabaseStartupService.cs`) after `COUNT()+1` collided under soft-deletes (23505).
**Principle**: any "next value" or "check-then-act" logic must be atomic at the database level. If two requests can race, they eventually will.

### 6. Deletion is a policy, not a boolean
🟢 Evidence: `IsDeleted` + global query filters; quota deliberately *not* refunded on delete (`PropertyService.cs`, commented).
**Principle**: for every entity decide: visible where? counts toward what? blocks which unique keys? Un-decided delete semantics become exploits.

### 7. Make invalid states unrepresentable — or at least centrally validated
🟢 Evidence: `PasswordPolicy.cs` as the single rule source after scattered checks caused a real bug (substring ban broke valid passwords).
🔵 Extension: value objects and state machines take this further than Boioot does (its model is primitives + service checks).
**Principle**: one authority per invariant. Annotations are floors, not the rule.

### 8. Two actors ⇒ two status fields
🟢 Evidence: `Property.Status` (owner intent) × `ModerationStatus` (platform approval); public visibility requires both.
**Principle**: never encode decisions made by different actors in one enum — they change independently, for different reasons, with different permissions.

## III. Security principles

### 9. Auth is a lifecycle, not an endpoint
🟢 Evidence (positive + negative): world-class refresh rotation with family revocation (`AuthService.RefreshAsync`) coexisting with **no** reset backend and **no** verification loop.
**Principle**: register → verify → login → reset → revoke → delete. Ship the loop, or buy it. Attackers enter through the missing door.

### 10. Every security control must define "client"
🟢 Evidence: lockout/limits keyed on left-most XFF because socket addresses change per hop behind Cloudflare→Vercel→Fly.
**Principle**: rate limits, lockouts, geo rules, and audit trails are only as correct as their identity key — and that key is proxy-dependent.

### 11. State that protects must survive what it protects against
🟢 Evidence: in-memory lockout/limits are per-instance and reset on restart — acceptable at 1 instance, silently weaker at N.
**Principle**: security counters need storage whose lifecycle exceeds the attack window (Redis, DB) once topology scales.

### 12. Re-assert control at every trust boundary
🟢 Evidence: presigned uploads finalize with ownership check + ImageSharp re-encode → WebP (strips EXIF/polyglots); server-side visibility filters on all public queries.
**Principle**: never trust what returns from the client side of a boundary — re-verify, re-encode, re-filter.

## IV. Delivery principles

### 13. Production truth = deployed commit, not repository HEAD
🟢 Evidence: workspace `main` observed 38 commits ahead of `origin/main`; prod 404s for locally-working routes.
**Principle**: know what production runs (`/version` endpoint, deploy notifications) before debugging any "works locally" report.

### 14. Idempotency is the price of automation
🟢 Evidence: every schema patch guarded by `information_schema` checks — safe on every boot, on any instance.
**Principle**: anything that runs automatically (migrations, seeds, jobs, webhooks) must be safe to run twice, because it will run twice.

### 15. The machine is part of the design
🟢 Evidence: 8 GB workspace OOM-kills `dotnet publish`; build strategy split accordingly; ephemeral disks 404 uploads after redeploy.
**Principle**: memory limits, disk lifetime, and cold-start behavior of the actual hosts shape correct architecture — design for the real machine.

### 16. Failures must be loud, caches must forget them
🟢 Evidence: Cloudflare cached a robots.txt 404 for 4 hours; sitemap degrades to static URLs instead of 500ing.
**Principle**: degrade gracefully on the response path, but never let infrastructure memorize an error without an expiry you chose.

## V. Product-engineering principles

### 17. Monetization gates never block the support path
🟢 Evidence: `Support`/`Admin` conversation types bypass chat plan limits (`MessagingService.cs`).
**Principle**: a user who cannot reach you is a churned user with a grievance.

### 18. Activation happens on approval events, not submission events
🟢 Evidence: subscriptions activate on `AdminConfirmPaymentAsync`, not on proof upload (`BillingService.cs`).
**Principle**: in any evidence-based workflow, value transfers only when the reviewing actor says so.

### 19. Constraints are design generators
🟢 Evidence: SYP card-rail weakness → manual payment-proof flow; Arabic market → RTL-first; multi-provider portability → TEXT GUIDs and raw-SQL patches.
**Principle**: enumerate market/platform constraints *before* choosing architecture — the "odd" designs in good systems are usually constraint-shaped, not mistakes.

### 20. Explainability beats sophistication at the start
🟢 Evidence: coverage matching scores 50–100 by declared area overlap (`RequestMatchingService.cs`) — every match is defensible.
**Principle**: start with monotonic, explainable rules; add ML only when volume proves rules insufficient — and keep the explanation.

---

## Lessons learned
1. Principles were cheapest to learn from *failures already paid for* here (23505 collisions, XFF bugs, cached 404s) — the handbook exists so they're paid once.
2. The strongest principles pair a positive and a negative example from the same codebase (#9): quality is uneven by default; principles even it out.

## Common mistakes
- Treating principles as style preferences instead of encoded incidents.
- Applying a principle without its trigger condition (e.g., distributed state at 1 instance is waste; at 2+ it's mandatory).

## Best practices
- Anchor every team principle to a real incident or verified code — unanchored principles get ignored.
- Review this list when a design "feels wrong" — usually one of the 20 names why.

## Rules to remember
- **Every principle here earned its place — reread the evidence line, not just the bold text.**

## Checklist for future projects
- [ ] At kickoff, walk principles 1–20 against the design doc
- [ ] For each violated principle, write the justification down (deviation with a reason is fine; drift isn't)
