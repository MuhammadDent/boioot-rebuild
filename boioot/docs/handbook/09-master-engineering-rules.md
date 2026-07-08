# 09 · Master Engineering Rules

> The consolidated, quick-scan rulebook — every "rule to remember" from
> chapters 01–08, deduplicated and grouped. Each rule traces to a chapter
> where the evidence and reasoning live. 🔵 = universal practice, 🟢 = also
> demonstrated in Boioot code, 🟡 = rule Boioot currently violates (see ch. 07).

## Architecture
1. 🟢 Dependencies point inward; enforce with project references, not discipline. *(ch. 01)*
2. 🟢 The proxy chain is part of your architecture — design IPs, headers, cookies, caching around it. *(ch. 01, 05)*
3. 🟢 Order of middleware = semantics of middleware; document why each element sits where it does. *(ch. 01)*
4. 🔵 Choose the simplest topology that isolates your two rates of change (UI vs API); split services by team count, never by fashion. *(ch. 01)*
5. 🟢 Organize code by business capability (feature folders), not technical kind. *(ch. 02)*

## API design
6. 🟢 DTO in, DTO out — entities never cross the API boundary. *(ch. 02)*
7. 🟢 One pagination envelope and one error shape across the whole API, decided before endpoint #2. *(ch. 02)*
8. 🟢 Visibility filtering is authorization — it lives on the server, in every query. *(ch. 02)*
9. 🟢 Clamp every client-supplied input at the boundary (page size, filters, lengths). *(ch. 04)*
10. 🟢 The browser only ever sees relative URLs when a proxy exists. *(ch. 03)*

## Data
11. 🟢 Business identifiers come from database sequences; surrogate keys from UUIDs (prefer UUIDv7 for new systems). *(ch. 04)*
12. 🟢 Never allocate "next number" with COUNT()/MAX()+1. *(ch. 02, 04)*
13. 🟢 Every soft-deleted row needs written answers: uniqueness? quota? visibility? *(ch. 04)*
14. 🟢 Schema changes must survive being run twice (idempotency) and one deploy overlap (expand→migrate→contract). *(ch. 02)*
15. 🟢 Index what you filter and sort — derive indexes from real query shapes. *(ch. 04)*
16. 🟡 Concurrency control wherever two humans share one edit screen (RowVersion on admin-edited rows). *(ch. 04)*
17. 🔵 jsonb (never TEXT) for any JSON you will ever query. Money = integer minor units + currency code. *(ch. 04, 08-KB)*

## Security
18. 🔵 Auth is a system: register→verify→login→reset→revoke→delete. Ship the lifecycle or buy it. *(ch. 05 — Boioot demonstrates login/refresh/revoke 🟢 but is missing reset/verify 🟡)*
19. 🟢 Access tokens short (≤15 min); refresh tokens HttpOnly, hashed at rest, rotated on use, family-revoked on reuse. *(ch. 05)*
20. 🟢 One central authority per security policy (passwords, permissions); annotations are floors. *(ch. 05)*
21. 🟢 Every control keyed on "the client" must define "client" behind proxies — and be tested through the real chain. *(ch. 05)*
22. 🟢 In-memory security state is per-instance security state; distribute it before instance #2. *(ch. 05)*
23. 🟢 Claims are a cache of permissions — know and accept their staleness window, or add token versioning. *(ch. 05)*
24. 🟢 Uploads: presigned + finalize-verify + re-encode + allowlist + size cap. *(ch. 05, 06)* 🟡 The second half — "local disk is never the system of record" — is violated by Boioot's silent local fallback when R2 is unconfigured.
25. 🔵 Tier password/MFA requirements by blast radius — admin accounts get the strict tier. *(ch. 05)*

## Product mechanics
26. 🟢 Support paths bypass paywalls — a user who can't reach you is churn plus a grievance. *(ch. 02, 08)*
27. 🟢 Approval events activate value; submission events never do. *(ch. 08-KB)*
28. 🟢 Platform status trumps owner status — two actors, two fields, both required for visibility. *(ch. 08-KB)*
29. 🟢 Every metered resource needs: counts-when, refunds-when, resets-when, and an anti-gaming answer. *(ch. 02)*
30. 🟢 Start matching/ranking explainable and monotonic; add ML only on top, and keep the explanation. *(ch. 08-KB)*

## Delivery & operations
31. 🟢 Production truth = deployed commit, not repository HEAD. `/version` endpoint + deploy notifications. *(ch. 06)*
32. 🔵 CI gates (build+test+typecheck) exist before deploy automation — untested deploys are tested by users. *(ch. 06)* 🟡 in Boioot
33. 🟢 Anything in memory dies on restart; anything on disk dies on redeploy. Plan storage lifecycles explicitly. *(ch. 06)*
34. 🟢 Caches remember your failures — set cache policy on error responses deliberately; purge on deploy. *(ch. 06)*
35. 🟢 Health checks + dependency-ordered startup (wait loops) from day one. *(ch. 06)*
36. 🟢 The build machine's limits (RAM, time) are design inputs — document them next to the scripts. *(ch. 06)*
37. 🟡 A skipped type check is a deferred production incident (`ignoreBuildErrors` must not survive launch). *(ch. 03)*
38. 🔵 Minimum observability before first real user: exception tracker + uptime probe + log retention. *(ch. 06)*

## Process & knowledge
39. 🟢 "Not implemented" must be written down or it will be assumed implemented — keep a living gaps register. *(ch. 07)*
40. 🔵 Test coverage follows money and irreversibility, not ease of testing. *(ch. 07)*
41. 🟢 Audit auth (and every feature) by user journey, not by folder — gaps cluster around flows. *(ch. 07)*
42. 🟢 Extract the invariant, rebuild the parameters — patterns transfer, thresholds don't. *(ch. 08-KB)*
43. 🟢 Stale docs are worse than none (a README claiming the wrong database misleads every newcomer). *(ch. 07)*
44. 🔵 Deviating from a rule is fine with a written reason; drifting from it silently is not. *(ch. 08)*

---

## Lessons learned
- Rules compress experience: 15 of the 44 encode incidents that actually happened in this codebase (collisions, XFF bugs, drift, cached 404s, OOM builds).

## Common mistakes
- Reading the rules without the chapter evidence — the trigger conditions matter as much as the rule.
- Enforcing 🔵 rules as dogma in contexts whose constraints differ (see rule 42).

## Best practices
- Use this file as a design-review checklist: walk categories relevant to the change.
- When you break a rule knowingly, cite its number and the reason in the PR/design doc.

## Rules to remember
- **This file is the index of rules; the chapters are the proof. Never ship a rule change without updating its proof.**

## Checklist for future projects
- [ ] Copy this rulebook into the new project's docs on day one
- [ ] Mark each rule: applies / deferred-with-reason / N-A-with-reason
- [ ] Re-walk the list at each stage change (launch, scale-out, second dev, regulation)
