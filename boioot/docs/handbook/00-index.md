# Boioot Engineering Handbook

> A personal engineering reference manual built from the real Boioot codebase.
> Every claim about Boioot is traced to a concrete file. Anything absent is stated
> as **Not implemented** — never assumed.

Generated: 2026-07-08 · Codebase: `boioot/apps/{backend,frontend}` · Backend: .NET 8 / ASP.NET Core / EF Core / PostgreSQL · Frontend: Next.js 16 (App Router) / React / Tailwind v4

## How to read this handbook

Every major topic follows the same four-part teaching structure:

| Section | Meaning |
|---|---|
| **1. What exists in Boioot** | Verified facts from the codebase, with file paths |
| **2. Why this approach** | The engineering reasoning behind the choice |
| **3. Modern alternatives** | Other approaches used in current software engineering |
| **4. When to use each** | Decision guidance for your future projects |

Every chapter ends with: **Lessons learned · Common mistakes · Best practices · Rules to remember · Checklist for future projects.**

Three labels are used throughout to keep facts separate from advice:

- 🟢 **Existing implementation** — what the code actually does today
- 🔵 **Best practice** — industry-standard guidance (may or may not match Boioot)
- 🟡 **Recommendation** — a suggested improvement for Boioot specifically

## Chapters

| # | Chapter | Covers |
|---|---|---|
| 01 | [Architecture Overview](01-architecture-overview.md) | Topology, layering, request lifecycle, dev vs prod |
| 02 | [Backend Guide](02-backend-guide.md) | Startup pipeline, DI, DB patch model, feature modules |
| 03 | [Frontend Guide](03-frontend-guide.md) | Routes, data fetching, state, RTL, SEO |
| 04 | [Data Model](04-data-model.md) | Entities, enums, conventions, EF configuration |
| 05 | [Security](05-security.md) | Auth, RBAC, rate limiting, lockout, headers, uploads |
| 06 | [Operations](06-operations.md) | Build, run, deploy, CI/CD, environment gotchas |
| 07 | [Gaps & Recommendations](07-gaps-and-recommendations.md) | Explicit register of what is NOT implemented |
| 08 | [Engineering Knowledge Base](08-engineering-knowledge-base.md) | Reusable patterns for SaaS, Marketplace, ERP, CRM, Healthcare, AI, FinTech, Real Estate |
| 08b | [Engineering Principles](08-engineering-principles.md) | 20 principles, each anchored to verified Boioot evidence |
| 09 | [Master Engineering Rules](09-master-engineering-rules.md) | The consolidated 44-rule quick-scan rulebook |
| 10 | [Software Design Patterns](10-software-design-patterns.md) | Patterns present in Boioot (cited) and patterns deliberately absent, with adoption triggers |
| 11 | [Project Bootstrap Checklist](11-project-bootstrap-checklist.md) | Phase-ordered checklist for starting any production-grade SaaS |
| 12 | [Future Improvements Roadmap](12-future-improvements-roadmap.md) | 🟡 Sequenced roadmap derived from the chapter-07 gaps register |

Chapters 01–07 additionally contain an **Advantages & limitations** section per chapter, so every chapter covers: existing implementation, why chosen, advantages, limitations, alternatives, when to use, common mistakes, best practices, lessons learned, and a future-project checklist.

## The system in one paragraph

Boioot is an Arabic-first (RTL) real-estate marketplace for Syria. A Next.js 16
frontend (`boioot/apps/frontend`) serves all pages and proxies `/api/*` to a
.NET 8 API (`boioot/apps/backend`) structured as Clean Architecture
(Domain → Application → Infrastructure → Api). PostgreSQL stores all data;
Cloudflare R2 stores uploads (with local-disk fallback). Production is
Cloudflare → Vercel (frontend) → Fly.io (API), deployed from GitHub `main`.
The business model is subscription SaaS: plans gate listing quotas, chat,
featured placement, and lead unlocks, with both Stripe and manual
payment-proof billing (common for the SYP currency region).
