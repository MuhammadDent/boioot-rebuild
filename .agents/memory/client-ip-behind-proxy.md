---
name: Client IP behind the deploy proxy chain
description: Why RemoteIpAddress is unusable for per-client keys in prod, and what to use instead
---

Anything that keys by "client IP" (login lockout, rate limiting, abuse throttles) MUST derive the IP from the **left-most `X-Forwarded-For` entry** (fallback `RemoteIpAddress`), exactly like `AuthController.GetClientIp()`. Do NOT key off `HttpContext.Connection.RemoteIpAddress` directly.

**Why:** In the deployed topology the request path is Replit edge → Next.js `/api` proxy → .NET API on localhost:8080. `UseForwardedHeaders` is configured with the default `ForwardLimit` (=1), so it only unwinds ONE hop. The resulting `RemoteIpAddress` is an *internal proxy address that changes per request*, not the real client. Keys built from it scatter across requests, so a per-IP threshold (e.g. 5 failed logins) is **never reached** — this is a prod-only failure that passes all local unit tests (locally `RemoteIpAddress` is a stable 127.0.0.1). It caused the login lockout to never trip ("5 fails, 6th valid succeeds, no 429") and the same latent bug still affects the `auth` rate limiter policy.

**How to apply:** Resolve the key as `X-Forwarded-For.FirstOrDefault()?.Split(',')[0].Trim()` else `RemoteIpAddress`. To *reproduce prod in a unit test*, inject a varying `RemoteIpAddress` with a stable `X-Forwarded-For` and assert the lockout/limit still trips. Known tradeoff: left-most XFF is client-spoofable; proper hardening is trusting the proxy chain (ForwardLimit + KnownProxies/KnownNetworks) so a trusted client IP is attested — but Replit's proxy ranges aren't whitelisted today, so the whole-app convention is left-most XFF.
