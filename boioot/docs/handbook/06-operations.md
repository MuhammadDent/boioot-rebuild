# 06 · Operations

## Topic A — Environments & the deployment pipeline

### 1. What exists in Boioot 🟢

Three distinct environments, with different topologies:

| Environment | Frontend | API | DB | Trigger |
|---|---|---|---|---|
| Dev (Replit workspace) | `next dev --webpack` on :3000 | `run-api.sh` on :8080 | workspace PostgreSQL | workflows |
| Single-box prod (Replit publish) | `next start` on `$PORT` | internal :8080 | Replit PG | `run-prod.sh` |
| **Real production** (boioot.com) | Vercel | Fly.io (`fra`, Dockerfile) | managed PG | **push to GitHub `main`** |

- CI/CD (verified): `.github/workflows/deploy-backend.yml` — the only *active* push-triggered workflow; deploys the API to Fly.io on pushes to `main` touching `boioot/apps/backend/**` (a second workflow, `fly-deploy.yml`, exists but is disabled/manual-only). The frontend deploys via Vercel's Git integration. **No CI test/lint pipeline exists** — deployment is the only automated step.
- Scripts: `boioot/build-prod.sh` (publish API + build Next), `boioot/run-prod.sh` (start API, health-wait loop on `/health`, then Next; traps signals), `boioot/apps/backend/run-api.sh` (dev runner: kills stale processes, timestamp-based rebuild decision, fast/slow path).
- Fly.io: multi-stage Dockerfile (base/build/final), port 8080, HTTP health checks on `/health`.

### 2. Why this approach

- Git-push-to-deploy with path filters gives near-zero-ops continuous delivery for a solo/small team.
- The health-wait loop in `run-prod.sh` encodes a real dependency: Next SSR pages fetch the API at startup — starting them in parallel produces a burst of `ECONNREFUSED` (observable in dev logs today).

### 3. Modern alternatives

- Full CI gates (build+test+lint) before deploy; preview environments per PR; blue/green or canary deploys; IaC (Terraform) for the platform config; GitOps (ArgoCD) in Kubernetes shops.

### 4. When to use each

- Push-to-deploy without gates is acceptable only while one person ships and tests manually. The first "it built locally but not in CI" incident pays for the pipeline.
- 🟡 **Recommendation**: add a minimal GitHub Action running `dotnet build + dotnet test` and `next build` (type-check enabled) on PRs — the repo already has tests that nothing runs automatically.

---

## Topic B — Operational gotchas discovered in this project (all verified)

### 1. What exists in Boioot 🟢

1. **Deploy-from-GitHub drift**: the workspace `main` has been observed **38 commits ahead of `origin/main`** — code that "exists" can be entirely absent from production. A prod 404 for a locally-working route means *stale deployment*, not broken code. First diagnostic: `git branch -vv`.
2. **Cloudflare caches 404s**: prod `robots.txt` 404 was cached with `max-age=14400` (4 h). After a real deploy, stale 404s persist unless cache is purged.
3. **Build memory limits**: `dotnet publish` gets OOM-killed in the 8 GB workspace (`prod-build` workflow step 1/2). Frontend `next build` alone succeeds (~100 s). Build steps must be sized to the machine.
4. **Ephemeral filesystems**: with R2 creds absent, uploads fall back to local disk — which autoscale platforms wipe on every deploy. Only files *committed* in `wwwroot/uploads` survive; everything else 404s after redeploy.
5. **In-memory state × autoscale**: lockout counters and rate-limit budgets are per-instance (chapter 05) — horizontal scaling silently multiplies attacker budgets.
6. **Proxy-only bugs**: client-IP extraction (left-most XFF) behaves differently in prod than in any local test — some bug classes exist only behind the real chain.

### 2. Why documenting these matters

Each is an *environment* fact, not a code fact — invisible in the repository, rediscovered expensively unless written down. This section is the project's institutional memory.

### 3. Modern alternatives (prevention mechanisms)

- Drift: deploy status badges/notifications; branch protection forcing PRs; a `/version` endpoint returning the deployed commit SHA.
- Cache: explicit `Cache-Control` on error responses; purge-on-deploy hooks.
- State: Redis for anything that must survive restarts or span instances.
- Files: object storage as the *only* write path; treat local disk as `/tmp`.

### 4. When to use each

- A `/version` endpoint returning git SHA is nearly free and kills the entire "is prod running my code?" class of confusion — 🟡 top-value recommendation here.

---

## Topic C — Observability & operability

### 1. What exists in Boioot 🟢

- `ILogger` structured logging throughout; EF Core command logging visible in dev; `/health` endpoint consumed by Fly checks.
- **Not implemented** (verified): error tracking (Sentry etc.), metrics/APM, centralized log aggregation, alerting, uptime monitoring, security audit trail, `/version` endpoint.

### 2. Why the gap is common

Observability produces no user-visible feature, so it loses every prioritization contest — until the first production incident, when its absence sets the debugging speed.

### 3. Modern alternatives

- OpenTelemetry (traces+metrics+logs) → Grafana/Honeycomb/Datadog; Sentry for exceptions; UptimeRobot/BetterStack for probes; PostHog for product analytics alongside GA4.

### 4. When to use each

- Minimum viable for a revenue-bearing app: exception tracker + uptime probe + platform log retention. That trio is hours of setup.
- Full OTel tracing earns its keep once there are ≥2 services in a request path (Boioot qualifies: Next SSR → API).

---

## Advantages & limitations of Boioot's choices

| Topic | Advantages 🟢 | Limitations 🟢 |
|---|---|---|
| Push-to-deploy (path-filtered) | Near-zero ops; fast iteration for a small team | No quality gates — broken code deploys; drift between workspace and origin/main goes unnoticed |
| Health-wait startup ordering | Eliminates boot-time connection noise; encodes the real SSR→API dependency | Serializes startup (slower cold boots); a hung API blocks frontend start |
| Multi-environment scripts (dev/single-box/split prod) | Same codebase runs on three hosting shapes | Three shapes to keep in sync; environment-only bugs (IP handling, caching, ephemeral disk) exist per shape |
| `ILogger` + `/health` only | Simple; enough for platform health checks | No error tracking, metrics, alerting, or `/version` — incidents are debugged blind |

## Lessons learned

1. **"Works locally, 404 in prod" has a decision tree**: check deployment freshness (`git branch -vv`, `/version`) *before* touching code — this project converted an intended code rewrite into a one-command diagnosis.
2. **The build machine is part of the architecture** — OOM-killed builds shaped this repo's tooling (workflow-based rebuilds, split build steps).
3. **Startup order is an ops concern**: API-before-frontend with a health-wait loop eliminated an entire class of boot noise.
4. **CDNs cache your failures too** — a 404 served once can outlive the fix by hours.

## Common mistakes

- Debugging application code when the deployment is simply stale.
- Local-disk writes on ephemeral/autoscale hosts.
- Having tests that no pipeline executes.
- No way to ask production "what commit are you?"

## Best practices

- Path-filtered deploy workflows; PRs + branch protection once >1 contributor.
- Health checks + dependency-ordered startup with wait loops.
- Object storage for all user content; disk is scratch space.
- Version endpoint + deploy notifications; purge CDN on deploy.

## Rules to remember

- **Production truth = deployed commit, not repository HEAD.**
- **Anything in memory is gone on restart; anything on disk is gone on redeploy.**
- **Untested deploys are tested by users.**
- **Caches remember your mistakes — set error-response cache policy deliberately.**

## Checklist for future projects

- [ ] CI: build + test + type-check on every PR before any deploy automation
- [ ] `/health` and `/version` endpoints from day one
- [ ] Object storage for uploads; no persistent local writes
- [ ] Exception tracking + uptime probe before launch
- [ ] Deploy notifications; know your drift at a glance
- [ ] Explicit cache headers on errors; CDN purge in the deploy story
- [ ] Document machine limits (build memory/time) next to the build scripts
