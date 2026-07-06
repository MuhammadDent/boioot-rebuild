---
name: Login lockout enforcement
description: How the sticky failed-login lockout is enforced on the Boioot API, and its scope limitation.
---

# Login lockout enforcement

Sticky, failure-based login lockout is enforced as a **pre-authentication MVC action
filter** (`IAsyncActionFilter`) applied to the login action. When a caller is locked
the filter short-circuits BEFORE `await next()` runs and returns 429 with `Retry-After`,
so valid credentials submitted during an active lockout still get 429 (no bypass). After
the action runs it registers a failure on 401 (read from both the `ActionResult` status
and a mapped domain exception's status code) and clears the counter on a 2xx.

**Why a filter, not middleware or service code:** it must run before the auth/credential
check and must be able to reject regardless of credential correctness, without touching
`AuthService.LoginAsync` (unrelated auth logic was explicitly out of scope).

**Scope limitation (important):** the lockout store is an in-memory singleton
(`ConcurrentDictionary`), so counters/lockouts are **per app instance**. This matches the
app's existing in-memory `auth` rate-limiting policy and in-memory DataProtection keys —
the whole rate-limiting subsystem is per-instance. On a multi-instance autoscale
deployment an attacker could spread attempts across instances to soften enforcement.
**How to apply:** if uniform cross-instance enforcement is required, move the backing
store to shared storage (Postgres is already present; Redis is an option) behind the same
`ILoginLockoutStore` contract, keeping the pre-auth filter unchanged and making
increment+lockout atomic. This was intentionally deferred as it exceeds a minimum-safe
change and is an architecture decision for the user to approve.
