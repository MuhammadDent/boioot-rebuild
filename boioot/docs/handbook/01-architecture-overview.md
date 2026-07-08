# 01 · Architecture Overview

## Topic A — System topology

### 1. What exists in Boioot 🟢

Two deployable applications in one repository:

```
Browser
  │ HTTPS
Cloudflare (DNS, CDN, cached 404s/assets)
  │
Vercel — Next.js 16 frontend (boioot/apps/frontend)
  │  rewrites /api/*, /uploads/*, /videos/*, /hubs/*  →  BACKEND_URL
Fly.io — .NET 8 API on port 8080 (boioot/apps/backend, fra region)
  │
PostgreSQL (DATABASE_URL) + Cloudflare R2 (uploads)
```

- Rewrites: `boioot/apps/frontend/next.config.ts` proxies `/api/:path*`, `/videos/:path*`, `/uploads/:path*`, `/hubs/:path*` (SignalR) to `process.env.BACKEND_URL`.
- The browser **never talks to the API directly** — same-origin via the Next proxy.
- Fly.io config: `boioot/apps/backend/fly.toml` (Dockerfile build, `/health` checks).
- A single-box variant also exists for Replit-style hosting: `boioot/run-prod.sh` runs Next on `$PORT` and the API on internal 8080 in one container.

### 2. Why this approach

- **Same-origin proxying** eliminates CORS complexity in the browser entirely and lets one set of security headers (in `next.config.ts`) govern everything the browser sees.
- **Separate deploys** let the frontend iterate (Vercel previews, edge network) independently of the API (long-lived server, database proximity).
- **Cloudflare in front** gives DDoS absorption, caching, and TLS termination without app-level work.

### 3. Modern alternatives

| Alternative | Description |
|---|---|
| Monolith (server-rendered) | One app serves HTML + logic (Rails, Django, Blazor, Next.js API routes only) |
| BFF (Backend-for-Frontend) | A thin API layer owned by the frontend team in front of domain services |
| Public API + SPA | Browser calls `api.example.com` directly with CORS + tokens |
| Microservices | Domain split into independently deployed services behind a gateway |
| Edge-first | Logic in edge functions (Cloudflare Workers, Vercel Edge) with regional DBs |

### 4. When to use each

- **Boioot's model (proxied two-app)**: small team, one product, different runtime needs per tier (SSR + long-running API). The sweet spot for most SaaS/marketplaces.
- **Monolith**: earliest stage, 1–3 devs, validate the product first. Simplest ops.
- **Public API + SPA**: when third parties/mobile apps consume the same API. You then need CORS, token discipline, and API versioning from day one.
- **Microservices**: only when team count (not user count) forces it — multiple teams shipping independently. Premature adoption is the most common architecture mistake.
- **Edge-first**: read-heavy, latency-sensitive global products; awkward with a single-region relational DB like Boioot's.

---

## Topic B — Backend layering (Clean Architecture)

### 1. What exists in Boioot 🟢

Four projects with clean, one-directional dependencies (`boioot/apps/backend/src`):

| Project | Contains | Depends on |
|---|---|---|
| `Boioot.Domain` | POCO entities, enums, constants | nothing |
| `Boioot.Application` | Service interfaces, DTOs, `PagedResult<T>`, `PasswordPolicy` | Domain |
| `Boioot.Infrastructure` | `BoiootDbContext`, EF configs, all service implementations (~35 feature folders under `Features/`), storage, email, billing providers | Application, Domain |
| `Boioot.Api` | Controllers (56), SignalR hubs, authorization handlers, `Program.cs` | Infrastructure, Application |

Verified: dependency direction is respected — Domain has no project references; implementations in Infrastructure implement interfaces declared in Application.

### 2. Why this approach

- Controllers stay thin; business rules live in services that can be reasoned about (and theoretically tested) without HTTP.
- Interfaces in Application mean the Api layer never news-up an implementation — DI wires `IPropertyService` → `PropertyService` in `Boioot.Infrastructure/Extensions/ServiceCollectionExtensions.cs`.
- Feature folders (`Features/Properties`, `Features/Billing`, …) keep each business area's service + DTOs together — "screaming architecture": the folder tree tells you what the product does.

### 3. Modern alternatives

- **Vertical Slice Architecture**: organize by use-case (e.g., `CreateProperty/` holds handler + validator + DTO), often with MediatR. No horizontal layers at all.
- **Transaction Script / minimal APIs**: endpoint lambdas calling the DbContext directly. Fastest to write, hardest to grow.
- **Full DDD**: aggregates, value objects, domain events, repositories. Boioot is explicitly *not* this — entities are anemic (data-only), logic lives in services.
- **CQRS (+ optional event sourcing)**: separate read and write models.

### 4. When to use each

- **Boioot's layered-services model**: teams comfortable with EF Core who want structure without ceremony. Good default for CRUD-heavy SaaS.
- **Vertical slices**: when features rarely share logic and you want each use case independently changeable; pairs well with CQRS-lite.
- **Full DDD**: complex invariants that must never be violated (money movement, inventory, healthcare dosing). The cost is real; pay it only where invariants justify it.
- **Minimal APIs / transaction scripts**: prototypes, internal tools, microservices with 3–5 endpoints.

---

## Topic C — Request lifecycle

### 1. What exists in Boioot 🟢

Middleware order in `Boioot.Api/Program.cs` (order is load-bearing):

1. `UseForwardedHeaders` — trust proxy headers (Fly/Vercel/Cloudflare hops)
2. Custom security headers middleware (CSP, HSTS-when-HTTPS, X-Frame-Options…)
3. Swagger
4. `UseRouting`
5. `UseExceptionHandler` — global handler aware of `BoiootException` and plan-limit errors
6. `UseCors` (config-driven origins; open in dev)
7. `UseStaticFiles` (×2: `wwwroot` and explicit `/uploads`)
8. `UseAuthentication`
9. `UseRateLimiter` — **deliberately after auth** so `content`/`upload` policies can partition per-user
10. `UseAuthorization`
11. `MapControllers` + SignalR hubs (`/hubs/notifications`, JWT via query string for WebSockets)

Additionally, login brute-force protection is *not* middleware — it is a pre-auth MVC action filter (`LoginLockoutFilter`) on the login action (see chapter 05).

### 2. Why this approach

- `ForwardedHeaders` first: everything downstream (rate limiting, lockout, logging) needs the *real* client IP, which only exists in `X-Forwarded-For` behind three proxy hops.
- Rate limiter after authentication: an authenticated user's limit should follow the user, not the IP (NAT'd offices, mobile carriers share IPs).
- One global exception handler = no stack traces to clients, consistent error JSON.

### 3. Modern alternatives

- **YARP / API gateway** owning cross-cutting concerns (rate limit, authN) outside the app.
- **Endpoint filters / MediatR pipeline behaviors** for per-use-case cross-cutting logic instead of global middleware.
- **Service mesh** (Istio/Linkerd) for infrastructure-level concerns in Kubernetes shops.

### 4. When to use each

- In-app middleware (Boioot's way) is right until you have multiple backend services — then a gateway centralizes policy.
- Pipeline behaviors shine with vertical slices: validation/logging per request type.
- 🔵 **Best practice**: whatever the mechanism, document the required *order* — most middleware bugs are ordering bugs (see Lessons below).

---

## Advantages & limitations of Boioot's choices

| Topic | Advantages 🟢 | Limitations 🟢 |
|---|---|---|
| Proxied two-app topology | Zero browser CORS; one header policy; independent deploy cadence for UI vs API; edge caching for free | More moving parts than a monolith; three proxy hops complicate IP/header handling; drift possible between the two deploy pipelines |
| Clean Architecture layering | Enforced dependency direction survived growth to 56 controllers; swappable infrastructure (3 DB providers); testable service seams | More projects/ceremony than small apps need; anemic entities push all logic into services, which can grow unbounded (`AdminService.cs` >2000 lines) |
| In-app middleware pipeline | All cross-cutting policy visible in one file (`Program.cs`); no extra infrastructure | Order-sensitivity is an invisible failure mode; policies don't extend to a second service without duplication |

## Lessons learned

1. **Middleware order is a real bug source, observed in this project**: `UseRateLimiter` placed before `UseAuthentication` silently degrades per-user partitioning to per-IP — no error, just weaker behavior.
2. **Behind proxies, `RemoteIpAddress` lies.** Boioot had to standardize on left-most `X-Forwarded-For` for lockout keys; the bug only appeared in production, never locally.
3. **Same-origin proxying pays for itself** — Boioot has zero browser CORS logic and one place (`next.config.ts`) to reason about browser-visible headers.
4. **Clean layering held up at scale**: 56 controllers and ~35 feature modules later, the dependency direction is still intact — structure chosen early survived growth.

## Common mistakes

- Splitting into microservices before there are multiple teams.
- Letting controllers grow business logic (Boioot avoids this; its risk sits instead in very large services — `AdminService.cs` >2000 lines).
- Assuming dev topology == prod topology (Boioot dev has no Cloudflare/Vercel hops; several behaviors — IP extraction, cached 404s — differ only in prod).
- Adding CORS wildcards to "fix" a proxy misconfiguration.

## Best practices

- One-directional project dependencies; enforce with project references, not discipline.
- Keep an explicit, commented middleware order in `Program.cs` with the *reason* each item sits where it does.
- Terminate TLS and absorb abuse at the edge (CDN), enforce identity and quotas in the app.
- Health endpoint (`/health`) from day one — Fly.io checks depend on it.

## Rules to remember

- **The proxy chain is part of your architecture.** Design IPs, headers, and caching around it.
- **Dependencies point inward.** Domain knows nothing about the web.
- **Order of middleware = semantics of middleware.**
- **Choose the simplest topology that isolates your two rates of change** (UI vs API).

## Checklist for future projects

- [ ] Draw the full request path including every proxy before writing auth/rate-limit code
- [ ] Decide monolith vs split by *team structure*, not by fashion
- [ ] Set up project layering + dependency direction in the first commit
- [ ] Global exception handler that never leaks stack traces
- [ ] `/health` endpoint + platform health checks
- [ ] Document middleware order with reasons inline
- [ ] Verify header/IP behavior in a production-like environment, not just locally
