# Boioot — منصة العقارات السورية

## Overview
Boioot is a Syrian real estate platform connecting buyers and sellers. It features a public marketplace, user dashboard, and administration panel, aiming to be the leading Arabic-first real estate solution in Syria. The platform provides tools for property listings, project showcases, and lead management, with future plans for advanced subscription models, robust billing integrations, and expanded content modules.

## User Preferences
I prefer simple language. I want iterative development. Ask before making major changes.

## System Architecture

**Frontend:**
- **Technology:** Next.js 16 (App Router, TypeScript)
- **UI/UX:** Arabic-first, Right-to-Left (RTL) design with a primary green color (`#2E7D32`) using Tailwind CSS.
- **Features:** Public property/project listings, user dashboard for managing listings and requests, admin panel for comprehensive platform management, inquiry forms, dynamic pricing, subscription management (upgrade/downgrade flows), and a full-stack blog.
- **Key UI/UX Decisions:** Conditional rendering of dashboard elements based on user roles and subscription features. Responsive design for various devices.

**Backend:**
- **Technology:** ASP.NET Core Web API (.NET 8)
- **Architecture:** Modular Monolith design pattern.
- **Database:** PostgreSQL (Replit built-in, `heliumdb`) + EF Core. SQLite supported via `Database:Provider=SQLite` env override for local dev.
- **Core Features:**
    - **Authentication & Authorization:** JWT-based with HttpOnly refresh tokens, BCrypt for password hashing, and role-based authorization (Admin, CompanyOwner, Broker, Agent, Owner, User).
    - **Entity Management:** Logical deletion (`ISoftDeletable`) for core entities.
    - **Property & Project Modules:** CRUD operations, public listings, pagination, filtering.
    - **Requests/Leads Module:** Anonymous lead capture and dashboard management.
    - **Subscription Module:** Manages plans, accounts, subscriptions, and invoicing with support for multiple billing providers. Includes a user role upgrade flow.
    - **Blog Module:** Full-stack blog system with admin CRUD and public display, including SEO features.
    - **RBAC Dashboard Isolation:** Fine-grained access control for dashboard features based on user roles and account types.
    - **Multi-Level User Verification:** Comprehensive system for identity and business verification with admin review workflows.
    - **CMS Lite:** `SiteContent` entity for managing site content with admin CRUD and a public API, integrated into the frontend via a context provider.
    - **Global Error Handling:** Consistent, localized JSON error responses.
    - **Plan-Based Access Control (PBAC):** Frontend-driven feature gating and limit enforcement based on user's subscription plan, with graceful degradation.

**UI Consistency (Day 8 pass):**
- `PropertyCard`: description block removed → all cards have equal heights; `memo()` wrap preserved.
- `ProjectCard`: `memo()` added; `loading="lazy"` + `decoding="async"` on images; uses `.project-card__tags` for badge alignment.
- `.error-banner` CSS class now includes flex layout by default — all inline `display:flex` overrides removed across the codebase.
- Projects page subtitle suppressed when `totalCount === 0 && !hasActiveFilters` to avoid double empty-state messaging.
- Filter apply button standardized to "تطبيق" across all list pages.
- `.project-card__tags` CSS class added (mirrors `.property-card__tags` — `margin-top: auto` pushes badges to card bottom).

**Key Design Decisions:**
- Logical deletion is used for key entities.
- Query filters are applied at the EF Core level for soft deletes and role-based access.
- The dashboard is integrated within the same Next.js application for a unified experience.
- Specific handling for SQLite GUID storage when mixing EF Core migrations and raw SQL seeding to ensure data consistency.

**Auth Lifecycle (hardened):**
- `dashboard/layout.tsx` guards all `/dashboard/*` routes: calls `saveRedirectTarget()` then redirects unauthenticated users to `/login`; redirects Admin/Staff to `/dashboard/admin`.
- `dashboard/admin/layout.tsx` renders `null` while `isLoading || !user` (prevents content flash before useEffect redirect fires).
- `login/page.tsx` uses `getRoleCategory(role)` from `rbac.ts` for reliable Admin/Staff vs Customer routing.
- `SubscriptionContext` uses `isStaffRole()` from `rbac.ts` for admin bypass (covers all 6 staff roles + Admin).
- Auth debug logging active in `AuthContext` (startup/login/logout), `SubscriptionContext` (bypass/fetch), `login/page.tsx`, and `dashboard/layout.tsx`.

**Routing:**
- Replit router port 80: `/` → boioot-frontend (port 3000); `/workspace-api` → api-server (port 8080, unused).
- All API calls go through Next.js rewrites: `/api/*` → `http://localhost:5233/api/*` (.NET backend).
- `NEXT_PUBLIC_API_URL=/api`. All `api.get/post` calls use paths WITHOUT `/api` prefix.

**PostgreSQL Migration Strategy (Day 12):**
- `appsettings.json` sets `Database:Provider=PostgreSQL` as default.
- On fresh DB: `EnsureCreated()` creates all tables from current EF Core model, then `InjectAllMigrationIdsAsync()` marks all 5 migrations as applied (bypasses SQLite-era migration SQL).
- On subsequent restarts: `__EFMigrationsHistory` table exists → `MigrateAsync()` runs (finds 0 pending → no-op).
- Future migrations: `dotnet ef migrations add <Name>` → `MigrateAsync()` applies automatically.
- `HasFilter("\"Code\" IS NOT NULL")` — uses quoted column name for PostgreSQL compat (also valid in SQLite).
- ModelSnapshot updated to match PG-safe filter expression.
- Missing 5th migration Designer file: harmless; migration ID manually injected into `__EFMigrationsHistory`.

**Performance Optimizations (Day 13):**
- `IMemoryCache`: Cities cached 6h, provinces 6h, neighborhoods 2h, property-options 5min. Cities 200ms → 44ms (↓78%).
- `BuyerRequestService`: All list/detail queries use `.Select()` projections — no more `Include(User)`. Only `FullName` joined.
- Composite indexes applied directly to PostgreSQL: `IX_Properties_Status_CreatedAt`, `IX_Properties_CompanyId_Status_CreatedAt`, `IX_Properties_OwnerId_CreatedAt`, `IX_BuyerRequests_IsPublished_CreatedAt`, `IX_BuyerRequests_UserId_CreatedAt`.
- Seeder bug fixed: sentinel company `00000000-0000-0000-0000-000000000001` now created before sample properties.
- Frontend: `PropertyCard` and `ProjectCard` have `loading="lazy"`, `decoding="async"`, `memo()`. `usePropertyLocations` has module-level singleton cache.

**Production Readiness (Day 14):**
- CORS: Environment-based (`AllowedOrigins` config key). In production set comma-separated origins; dev/unset = AllowAnyOrigin.
- `run-api.sh`: Sets `ASPNETCORE_ENVIRONMENT=Development` by default (can be overridden via env var for real deployments).
- `appsettings.Production.json` created: Overrides logging levels for production; relies on env vars for sensitive config.
- `appsettings.json`: SQL Server connection string password removed (blank). JWT key remains for dev.
- Sensitive data in API: PasswordHash, tokens, secrets never returned in API responses (verified via DTO audit).
- Admin endpoints: All require `[Authorize]` + RBAC `[RequirePermission]`. Verified: 401 without token.
- Error handling: Global exception handler logs all unhandled exceptions, returns Arabic message (no stack trace exposed).
- Frontend: `EmptyState`, `ErrorState`, `InlineBanner` components used consistently. `normalizeError` handles all error types.
- TypeScript: Fixed null-check closure errors in `_modal.tsx` (non-nullable alias `const p = property`). Fixed duplicate `color` key in `_analytics.tsx`.

## External Dependencies

- **Database:**
    - `Npgsql.EntityFrameworkCore.PostgreSQL` v8.0.10: PostgreSQL provider (production default).
    - `Microsoft.EntityFrameworkCore.Sqlite`: For local development (switch via `Database:Provider=SQLite`).
    - `Microsoft.EntityFrameworkCore.SqlServer`: ORM for database interaction.
- **Authentication/Security:**
    - `BCrypt.Net-Next`: For password hashing.
    - `System.IdentityModel.Tokens.Jwt`: For JWT generation.
    - `Microsoft.AspNetCore.Authentication.JwtBearer`: For JWT token validation.
- **Payment Processing:**
    - `Stripe`: Integrated for online payments via Checkout Sessions and webhooks.
    - Internal Billing Provider: Supports manual bank transfers.