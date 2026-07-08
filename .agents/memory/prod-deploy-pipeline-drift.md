---
name: Prod 404s from unpushed commits
description: boioot.com prod builds from GitHub origin/main; local main drifts far ahead, so new routes 404 in prod until pushed
---
Real production (Cloudflare → Vercel frontend → fly.io API) deploys from **GitHub origin/main**, not from this Replit workspace. Local `main` has been observed 38 commits ahead of `origin/main`.

**Why:** New frontend routes (e.g. sitemap.xml/robots.txt) returned 404 in prod despite working locally in both dev and `next build`+`next start` — the code had simply never been pushed, so Vercel never built it.

**How to apply:** When a route exists locally but 404s at boioot.com, first run `git --no-optional-locks branch -vv` and check `ahead N` before touching code. Also note Cloudflare caches prod 404s (robots.txt had `cache-control: max-age=14400`), so after a real deploy a stale 404 can persist up to 4h unless cache is purged. Git push must go through a user-approved background task, never directly.

Related: frontend `next build` here takes ~100s and works in a foreground `timeout 100 pnpm build`; detached setsid/nohup builds die silently when the bash session ends — don't rely on them.
