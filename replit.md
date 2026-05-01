# Boioot — منصة العقارات السورية

## Overview
Boioot is a Syrian real estate platform connecting buyers and sellers. It features a public marketplace, user dashboard, and administration panel, aiming to be the leading Arabic-first real estate solution in Syria. The platform provides tools for property listings, project showcases, and lead management, with future plans for advanced subscription models, robust billing integrations, and expanded content modules.

## User Preferences
I prefer simple language. I want iterative development. Ask before making major changes.
- Safe Mode for backend/production-like work is mandatory: additive-only changes, no existing API contract changes, no auth/middleware changes, no schema changes already in use, no unrelated refactors, no frontend logic changes unless explicitly requested.
- New backend functionality should be isolated in new services/modules/controllers where possible and integrated only after existing logic, preserving current behavior.
- Notification matching/creation must never block or slow down the original user flow; run it as a post-success background side-effect and swallow/log failures.
- Before delivering backend changes, validate that existing critical flows remain unaffected: listings, requests, image uploads, verification, subscriptions, and authentication.

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
    - **Rating/Reviews System (Booking-Based):** Multi-criteria review system tied to Confirmed/Completed bookings. Two review types: `TenantToProperty` (6 criteria: Cleanliness, Accuracy, Facilities, Communication, ContractCommitment, ValueForMoney) and `OwnerToTenant` (4 criteria: Communication, ContractCommitment, RespectProperty, Timeliness). Criteria scored 1-5; `OverallRating` auto-calculated as average and stored. Implemented via self-contained `BookingReviewsController.cs` (raw SQL, no EF migrations). Schema bootstraps lazily: `CREATE TABLE IF NOT EXISTS "BookingReviews"` + `CREATE TABLE IF NOT EXISTS "AppSettings"`. Feature flag `reviews.publicVisibilityEnabled` stored in `AppSettings` (default `false`). Endpoints: `POST /api/bookings/{id}/reviews/tenant`, `POST /api/bookings/{id}/reviews/owner`, `GET /api/bookings/{id}/reviews`, `GET /api/properties/{id}/reviews` (respects flag), `GET/PUT /api/admin/settings/reviews` (Admin role only). Business rules enforced server-side: only booking participants may review, no duplicate reviews per booking+type, only Confirmed/Completed bookings eligible. Frontend: `BookingCard` in dashboard shows review form for both tenant (renter mode) and owner (owner mode) on Confirmed/Completed bookings. `StarInput` component for 1-5 star selection per criterion. Reviews lazy-loaded per card via `GET /api/bookings/{id}/reviews`. Types in `types/index.ts`; API calls in `features/reviews/api.ts`.
    - **Booking Flow (Manual Owner-Approval, DailyRent):** Full redesign from auto-availability to manual owner-approval workflow. Status lifecycle: `PendingApproval → ApprovedAwaitingPaymentProof → PaymentProofSubmitted → Confirmed`, with branches `Rejected` (owner), `CancelledByTenant`, `CancelledByOwner`. Backend: `Booking.cs` extended with `PaymentProofUrls`, `PaymentProofNote`, `PaymentProofSubmittedAt`, `ApprovedAt`, `ConfirmedAt`. `SubmitPaymentProofRequest.cs` DTO added. `IBookingService` + `BookingService` include `SubmitPaymentProofAsync`, `OwnerConfirmAsync`, `RejectProofAsync`, `OwnerCancelAsync`. `BookingsController` exposes `POST /{id}/submit-proof`, `/{id}/confirm-payment`, `/{id}/reject-proof`, `/{id}/cancel-owner`. Schema columns bootstrapped idempotently via `DatabaseStartupService`. Frontend: `BookingStatus` type and `BookingResponse` extended; `bookingStatusConfig.ts` covers all new statuses with Arabic labels; `features/bookings/api.ts` has all 4 new call wrappers; `dashboard/bookings/page.tsx` has `OWNER_TABS` for each new status, per-card owner actions (approve, reject, confirm payment, reject proof, cancel), tenant payment-proof upload UI (file input → `/api/upload/proof` → `submitProof`). `PropertyDetailClient.tsx` has no availability gate — booking submit is always enabled for bookable properties.
    - **Subscription Module:** Manages plans, accounts, subscriptions, and invoicing with support for multiple billing providers. Includes a user role upgrade flow.
    - **Blog Module:** Full-stack blog system with admin CRUD and public display, including SEO features.
    - **RBAC Dashboard Isolation:** Fine-grained access control for dashboard features based on user roles and account types.
    - **Unified Reference Numbers:** 5 admin entities have human-readable reference numbers in format `PREFIX-YYYY-000001`. Prefixes: `USR` (Users), `VER` (VerificationRequests), `CNT` (ContactRequests/Requests), `MRK` (BuyerRequests), `REQ` (SpecialRequests). `ReferenceGenerator.cs` in `Boioot.Infrastructure/Common` generates sequentially. Generated on entity creation in the respective service. `DatabaseStartupService` adds the `ReferenceNumber` column + unique partial index to all 5 tables idempotently. Admin pages display reference numbers as clickable monospace blue badges (click to copy). Affected admin pages: `verification-requests`, `buyer-requests`, `special-requests`, `users` (card + detail panel), `requests` (RequestCard).
    - **Multi-Level User Verification:** Comprehensive system for identity and business verification with admin review workflows.
    - **In-App Notifications:** Existing notification endpoints and service are used for request discussion activity, verification review flows, subscription payment admin/user messages, and background buyer-request match alerts. Phase 1 message text for selected notification types is centralized in an in-code template registry/service without API or schema changes. Notification UX now exposes the bell in the public header for authenticated users, keeps the dashboard header bell, supports `/notifications` as the full-list entry, and maps buyer-match/verification notification types to appropriate icons, badges, CTAs, and targets. Frontend notification rendering is centralized through a shared `NotificationItem` component and `notificationTypeConfig` mapper used by both dropdown and full-list views. Real-time notifications are additive through a private SignalR hub at `/hubs/notifications`; the hub uses the same JWT `ClaimTypes.NameIdentifier` user id as REST auth, sends only to `Clients.User(userId)`, emits only after `SaveChangesAsync`, logs/swallow realtime delivery failures, and keeps the REST notification API as fallback/source of truth.
    - **CMS Lite:** `SiteContent` entity for managing site content with admin CRUD and a public API, integrated into the frontend via a context provider.
    - **UserImage Module:** `POST /api/upload/image` persists the uploaded file to Cloudflare R2 and saves a `UserImage` record (UserId, Url, FileKey) to the DB. `GET /api/upload/my-images` returns all images for the authenticated user (newest first). `DELETE /api/upload/{id}` removes the image from R2 and the DB (owner-only, 403 if mismatch, 404 if not found). The `UploadController` injects `BoiootDbContext` directly. Migration `20260415120000_AddUserImages` creates the `UserImages` table; `ApplyPostgresColumnFixesAsync` ALTERs its `CreatedAt`/`UpdatedAt` columns from TEXT → `timestamp with time zone` because Npgsql rejects reading TEXT as DateTime (all migrations use TEXT for cross-DB compat but EnsureCreated uses proper PG types only for the initial schema).
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
- Frontend image optimization pass (Phase 1): public property/project listing cards now use Next image optimization with responsive sizes, first visible card priority loading, optimized mobile gallery thumbnails, and longer image optimizer/upload cache headers.
- Frontend image optimization pass (Phase 2): project detail hero and gallery thumbnails converted to next/image (fill + lazy). Advertiser avatar in property detail converted to next/image (52×52, lazy). No dynamic import changes needed — leaflet/RichTextEditor already dynamic, InquiryForm has no heavy deps.
- Rating & Review system (DailyRent listings): Full-stack feature. Backend reuses existing `Review` entity with `TargetType=Property`; unique constraint added via idempotent schema patch; `POST /api/ratings`, `GET /api/listings/{id}/ratings`, `GET /api/listings/{id}/rating-summary`, `GET /api/listings/{id}/can-rate`. Business rules: completed booking required, one review per user per listing (DB-enforced), score 1-5. 5-minute memory cache on summary. Frontend: StarRating, StarSelector, ReviewCard, RatingsSummary, AddRatingForm, ListingRatings components; integrated in PropertyDetailClient for DailyRent listings only.

**Location Suggestion Flow:**
- New `LocationSuggestions` table (`Id`, `Name`, `Type`, `ParentId`, `Status=pending`, `CreatedAt`, `UpdatedAt`).
- New endpoint: `POST /api/locations/suggestions` — saves suggestion to `LocationSuggestions` only (no direct insert to `LocationCities` or `LocationNeighborhoods`).
- Shared `SuggestLocationModal` component (`components/ui/SuggestLocationModal.tsx`) — modal with text input, calls POST /api/locations/suggestions, shows success confirmation.
- Sentinel options `💡 اقترح مدينة/حي جديد...` added to city and neighborhood dropdowns in: onboarding page, coverage page, buyer-request creation page, and property listing creation (via `LocationSelect.tsx` CitySelect/NeighborhoodSelect).
- After successful suggestion: success banner shown, modal closes, dropdown retains no selection (user must wait for admin approval).
- `parentId` (city UUID) passed to neighborhood suggestions where available (onboarding, coverage, buyer-requests).

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
- **Realtime:**
    - `@microsoft/signalr`: Frontend SignalR client for private notification delivery with automatic reconnect and REST recovery.
- **Payment Processing:**
    - `Stripe`: Integrated for online payments via Checkout Sessions and webhooks.
    - Internal Billing Provider: Supports manual bank transfers.