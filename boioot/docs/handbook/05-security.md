# 05 · Security

## Topic A — Authentication & session model

### 1. What exists in Boioot 🟢

- **JWT access tokens**, HMAC-SHA256, key from `JWT_KEY` env (≥32 bytes enforced), **15-minute lifetime**. Claims: `sub`, `email`, `name`, `role`, `account_type`, and one `permission` claim per resolved RBAC permission (`Boioot.Infrastructure/Features/Auth/AuthService.cs`).
- **Refresh tokens**: opaque 64-byte random values, **SHA-256 hash stored** (`UserRefreshTokens` table), delivered as HttpOnly/Secure cookies scoped to `/api/auth`; 1-day default, 30-day "remember me". **Rotation on every refresh** with **reuse detection**: presenting a revoked token revokes the whole token family.
- **Passwords**: BCrypt (`BCrypt.Net-Next`). Central policy in `PasswordPolicy.cs` with two tiers — Standard (8+, letter+digit) and Admin (12+, upper+lower+digit+special); both reject common terms and the user's email local-part. DTO `[MinLength(8)]` is only a floor; the real rule is central.
- **Not implemented** (verified): email/phone verification loop (registration activates immediately), password reset backend (`/forgot-password` is a frontend page with **no API endpoint**), 2FA/MFA. The email service (`LoggingEmailService.cs`) **can** send via SMTP when `Email:SmtpHost`/`Email:FromAddress` are configured, and no-ops (logs `[EMAIL-NOOP]`) when they are not — so email capability exists; the missing pieces are the flows that would use it.

### 2. Why this approach

- Short access + rotating refresh is the modern JWT compromise: statelessness for 15-minute windows, revocability at the refresh boundary. Hashing stored refresh tokens means a DB leak doesn't yield usable sessions.
- Family revocation on reuse is the standard defense against stolen-refresh-token replay.
- Two password tiers reflect blast radius: an admin account failure is a platform failure.

### 3. Modern alternatives

- **Server-side sessions** (cookie + session store) — simplest to revoke, no JWT parsing pitfalls.
- **Managed identity providers**: Auth0/Clerk/Keycloak/Entra — buy the hard parts (MFA, breach detection, passkeys).
- **Passkeys/WebAuthn** — phishing-resistant, increasingly the recommended primary factor.
- **Argon2id** hashing — current OWASP first choice over bcrypt (bcrypt remains acceptable).

### 4. When to use each

- Self-built JWT+refresh (Boioot's path): defensible when you need full control and have the discipline shown here (rotation, hashing, families). The hidden cost is everything *around* auth: reset flows, verification, MFA — exactly Boioot's current gaps.
- Managed IdP: default choice for teams < 5 or anything regulated — the gaps above come included.
- Passkeys: add once your IdP or library supports them; especially valuable where password reuse is rampant.

---

## Topic B — Authorization (roles + dynamic RBAC)

### 1. What exists in Boioot 🟢

- Coarse roles: `UserRole` enum (`User, Owner, Broker, Agent, CompanyOwner, Admin, Office`) via `[Authorize(Roles=…)]`.
- **Dynamic RBAC layer** (`Boioot.Api/Authorization/`): `[RequirePermission("…")]` attribute + `PermissionPolicyProvider` + `PermissionAuthorizationHandler`; permissions defined in DB (`RbacRole/RbacPermission/...`), managed via `AdminRbacController`, resolved at login and carried as JWT claims. Verified in use across 9 Admin controllers (e.g. `AdminController.cs` 48 `[RequirePermission]` usages, `AdminBlogController.cs` 16, `AdminRbacController.cs` 9).
- Separation by route *and* attribute: `/api/admin/*` (permission-gated) vs `/api/dashboard/*` (ownership/role-gated). Frontend mirrors with layout guards.
- Trade-off to know 🟢: permissions ride in the JWT ⇒ **grants/revocations take effect on next token refresh (≤15 min), not instantly**.

### 2. Why this approach

- Enum roles alone couldn't express a back-office where staff members need granular, admin-configurable rights; DB-driven permissions make access an *operational* concern, not a deploy.
- Claims-embedded permissions keep authorization checks in-process and fast (no DB hit per request).

### 3. Modern alternatives

- **Policy/relationship-based**: OpenFGA/SpiceDB (Zanzibar model) for "who can act on *this specific object*"; **ABAC** (attribute rules); **Casbin**; per-request DB permission lookup (instant revocation, +latency).

### 4. When to use each

- Role+permission claims (Boioot's): right for staff back-offices with tens of permissions.
- ReBAC (Zanzibar-style): when sharing/ownership graphs appear ("agent X can edit listing Y because agency Z employs them") — marketplaces grow into this.
- If instant revocation is a hard requirement (fired employee scenarios), add a token-version check or short server-side session — 🟡 worth considering for Boioot admin accounts.

---

## Topic C — Abuse protection: rate limiting, lockout, client identity

### 1. What exists in Boioot 🟢

- **Named rate-limit policies** in `Program.cs` (no global limiter): `auth` 5 req/5 min per IP; `content` 15/min and `upload` 60/min partitioned by UserId when authenticated, else IP. `UseRateLimiter` runs **after** `UseAuthentication` — required for per-user partitioning (verified failure mode: before auth, it silently degrades to IP-only).
- **Login lockout** (`LoginLockoutFilter`, covered by the only unit tests in the repo): a pre-auth MVC action filter that short-circuits *before* credential checks; sticky — during lockout even valid credentials get 429; keyed by client IP.
- **Client IP** = left-most `X-Forwarded-For` entry, *not* `Connection.RemoteIpAddress` — behind Cloudflare→Vercel→Fly the socket address changes per hop/request; this bug class is production-only, invisible in local tests.
- Limitation 🟢: lockout store and rate limiters are **in-memory** — per-instance, reset on restart, not shared across autoscaled instances.

### 2. Why this approach

- Pre-auth lockout ensures the expensive/attackable path (BCrypt verify + DB) is never reached during an attack window.
- Sticky lockout (reject valid logins too) prevents an attacker from confirming a correct guess during the lockout window.

### 3. Modern alternatives

- **Distributed stores** (Redis) for limiter/lockout state across instances; **edge rate limiting** (Cloudflare rules/WAF) before traffic reaches the app; per-account (not per-IP) lockout with progressive delays + CAPTCHA; IP reputation feeds.

### 4. When to use each

- In-memory is acceptable at instance-count ≈1 (Boioot today); the moment you scale out, an attacker gets N× the budget — move state to Redis or push limits to the edge.
- 🔵 Best practice: layer both — coarse volumetric limits at the CDN, semantic limits (per-user, per-endpoint) in the app.

---

## Topic D — Headers, validation, uploads

### 1. What exists in Boioot 🟢

- **API headers** (`Program.cs`): CSP, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy, HSTS when HTTPS; Kestrel `AddServerHeader=false` + `X-Powered-By` removal (verified remediated in prod; remaining `server: cloudflare`/`via: fly.io` are platform-injected).
- **Frontend headers** (`next.config.ts`): mirrored set, applied also to proxied routes so the browser always sees them.
- **Validation**: DataAnnotations on DTOs + central manual checks (`PasswordPolicy.EnsureValid`, `SafeTextGuard` for sanitization). FluentValidation **not present**.
- **Uploads**: presigned direct-to-R2 PUT (`/api/images/direct-upload-url` → `pending-direct-uploads/{userId}/…` → finalize). Finalize verifies key ownership + existence, re-processes with ImageSharp → WebP, 10 MB cap, MIME allowlist. Local-disk fallback when R2 creds absent.
- **Not implemented** (verified): CSRF anti-forgery layer (relies on JWT-in-header + SameSite cookies), centralized security audit log, distributed limiter state, SRI on third-party scripts (vendors don't support it — assessed N/A earlier in this project).

### 2. Why this approach

- Presigned direct upload keeps large bodies off the API (cost, timeouts) while the **finalize step re-asserts control**: ownership check + server-side re-encode. Re-encoding to WebP is also a security wash — it strips EXIF and neutralizes polyglot-file tricks.
- Bearer-token APIs are largely CSRF-immune *by construction* (no ambient credential on cross-site requests) — the residual risk sits only on the cookie-scoped `/api/auth` endpoints, mitigated by SameSite.

### 3. Modern alternatives / 4. When to use each

- Malware scanning (ClamAV/cloud scanners) on uploads — required in Healthcare/enterprise contexts.
- Signed GET URLs for private documents (Boioot's verification documents deserve this if not already private-bucketed).
- CSP nonces + strict-dynamic when you must allow third-party scripts but want to end `unsafe-inline`.

---

## Lessons learned

1. **Proxy identity is the root of all abuse-protection correctness** — lockout and rate limiting are only as good as the IP they key on; test them through the real chain.
2. **Middleware order silently changes security semantics** (limiter-before-auth degradation). "It runs" ≠ "it protects".
3. **Central policy beats scattered annotations**: Boioot's password rules live in one class after a substring-matching bug ("boioot" ban broke valid passwords) showed how fragile ad-hoc rules are.
4. **A world-class token model can coexist with missing basics** — rotation + reuse detection exist here, while password reset and email verification don't. Attackers pick the weakest door, not the most interesting one.

## Common mistakes

- Building login before building reset/verification/lockout (the "happy-path auth" trap).
- Keying lockout on `RemoteIpAddress` behind a CDN.
- Trusting client MIME/extension on uploads; skipping server-side re-encode.
- Assuming JWT statelessness and instant revocation can both be true.

## Best practices

- Hash stored refresh tokens; rotate on use; revoke families on reuse.
- Tiered password policies; central enforcement; deny-list common terms.
- Same security headers from every tier the browser can reach.
- Re-encode all uploaded images; allowlist types; cap size; verify ownership at finalize.

## Rules to remember

- **Auth is a system (login+reset+verify+lockout+MFA), not an endpoint.**
- **Every security control keyed by "client" must define "client" behind proxies.**
- **In-memory security state is per-instance security state.**
- **Claims are a cache of permissions — know their staleness window.**

## Checklist for future projects

- [ ] Access ≤15 min; refresh HttpOnly, hashed at rest, rotating, family-revoked
- [ ] Password policy central + tiered; Argon2id/bcrypt
- [ ] Email verification + password reset shipped *with* login, not after
- [ ] Lockout + rate limits keyed on proxy-correct client identity, tested through the chain
- [ ] Limiter/lockout state distributed if instances >1
- [ ] Security headers on every browser-visible tier
- [ ] Uploads: presigned + finalize-verify + re-encode + allowlist + cap
- [ ] Decide revocation latency budget; add token-versioning if minutes are too long
