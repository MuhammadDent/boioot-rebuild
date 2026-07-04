---
name: Rate limiting (ASP.NET Core)
description: How Boioot's API rate limiting is structured and the middleware-ordering gotcha that governs per-user partitioning.
---

# Rate limiting

The API uses ASP.NET Core's built-in rate limiter (`AddRateLimiter` in
`Program.cs`), with **named per-group policies applied per-endpoint via
`[EnableRateLimiting("...")]`** — there is deliberately **no global limiter**,
so public read/browse APIs are never throttled. Policies: `auth` (strict, IP),
`content` (moderate, user-or-IP), `upload` (generous, user-or-IP). A single
shared `OnRejected` returns 429 + `Retry-After` + an Arabic `RATE_LIMITED` JSON
body; reuse it for any new policy rather than writing a new rejection handler.

## Ordering gotcha (the important part)
`app.UseRateLimiter()` MUST run **after `app.UseAuthentication()`** (and before
`app.UseAuthorization()`). If it runs before authentication, `HttpContext.User`
is empty during partition-key selection, so any "partition by authenticated
user id, else IP" logic silently degrades to **IP-only** keying — which causes
cross-user throttling behind shared NAT/proxy IPs and defeats per-user limits.

**Why:** this was a real regression — the limiter was originally placed right
after `UseCors` (pre-auth), and per-user buckets appeared to work in code but
collapsed to IP at runtime. Caught only by testing two authenticated users on
one IP.

**How to apply:** when adding a claim-based partition (user id, tenant id,
role, etc.) to any limiter policy, verify the middleware runs after the piece
that populates `HttpContext.User`. Regression check: two distinct JWTs from the
same client IP must get independent buckets.
