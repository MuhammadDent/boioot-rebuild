# Boioot — منصة العقارات السورية

## Overview
Boioot is a Syrian real estate platform designed to connect buyers and sellers within the Syrian market. It features a public real estate marketplace, a user dashboard, and an administration panel. The platform aims to be the leading Arabic-first real estate solution in Syria, providing comprehensive tools for property listings, project showcases, and lead management. Future ambitions include advanced subscription models, robust billing integrations, and expanded content modules like blogging.

## User Preferences
I prefer simple language. I want iterative development. Ask before making major changes.

## System Architecture

**Frontend:**
- **Technology:** Next.js 16 (App Router, TypeScript)
- **Structure:** A single Next.js application serves three main sections: the public site (`(public site)`), the user dashboard (`dashboard`), and the admin panel (`admin`).
- **UI/UX:** Arabic-first, Right-to-Left (RTL) design with a primary green color (`#2E7D32`). Tailwind CSS is used for styling.
- **Features:**
    - Public property and project listings with detail pages.
    - Dashboard for users to manage their properties, projects, and requests.
    - Admin panel for managing users, companies, properties, projects, and requests.
    - Inquiry forms on property and project detail pages for lead capture.
    - Dynamic pricing page with billing toggles and subscription plan cards.
    - Upgrade/downgrade subscription flow with a modal.
    - Dashboard modules for properties (CRUD), projects (CRUD), and requests management.
    - Admin-specific modules for user management (activate/deactivate), company verification, and read-only views of properties, projects, and requests.

**Backend:**
- **Technology:** ASP.NET Core Web API (.NET 8)
- **Architecture:** Modular Monolith design pattern.
- **Database:** SQLite + EF Core. Migrations are handled manually for `ALTER TABLE` operations.
- **Core Features:**
    - **Authentication & Authorization:** JWT-based auth with Phase 1A + 1B security hardening. Access tokens 15 min. Opaque refresh tokens with SHA-256 hashing, rotation, reuse detection, revocation. Phase 1B: refresh token transported as HttpOnly cookie (`boioot_rt`, SameSite=Lax, Path=/api/auth) — never exposed to JS. Session management: `GET /auth/sessions`, `DELETE /auth/sessions/{id}`, `DELETE /auth/sessions/others`. `rememberMe` controls cookie lifetime (1d vs 30d). BCrypt for passwords. Role-based authorization (Admin, CompanyOwner, Broker, Agent, Owner, User). Auto-creates Company + Agent on signup for CompanyOwner and Broker roles. JWT includes `account_type` claim for roles with accounts (CompanyOwner/Agent/Broker/Owner) — values: "Company", "Office", "Individual". Used to differentiate CompanyOwner+Office from CompanyOwner+Company without a separate role.
    - **Entity Management:** 12 core entities with `ISoftDeletable` interface implemented for logical deletion (User, Company, Property, Project).
    - **Property Module:** Public listing/detail, CRUD operations for dashboard, pagination, filtering.
    - **Project Module:** Public listing/detail, CRUD operations for dashboard, `IsPublished` flag. Includes fields like `StartingPrice`, `DeliveryDate`, `Lat/Lon`. Access-controlled via `CompanyProjectsOnly` policy (Admin OR CompanyOwner with `account_type=Company`). Office accounts (CompanyOwner + account_type=Office) are blocked at API level and redirected at frontend level. Sidebar item "المشاريع" is injected only for Company accounts via `canAccessProjects(user.accountType)` in `DashboardSidebar.tsx`.
    - **Requests/Leads Module:** Anonymous lead capture, dashboard management for requests with statuses (New, Contacted, Qualified, Closed).
    - **Role Management:** Support for various user roles with specific permissions, including Broker managing Agents.
    - **Subscription Module:** Management of plans, accounts, subscriptions, and invoices. Supports multiple billing providers. Plan assignment during registration is role-aware (Owner→owner_free, Broker→broker_free, CompanyOwner+RealEstateOffice→office_free, CompanyOwner+DeveloperCompany→company_basic). Legacy mis-assigned subscriptions are auto-corrected on startup via `PlanCatalogSeeder.CorrectMisassignedSubscriptionsAsync()`. **User Role Upgrade Flow (Phase 2):** Regular `User` accounts now have full subscription management access via dashboard sidebar (اشتراكاتي + ترقية الحساب links). `/dashboard/subscription` shows a `FreePlanDisplay` component when the user has no active subscription, listing free seeker plan limits and 4 upgrade cards (مالك/وسيط/مكتب/شركة) each linking to plans page with `?audience=xxx` query param. `/dashboard/subscription/plans` has a User-specific audience tab selector (seeker/owner/broker/office/company) initialized from `?audience=` URL param via `window.location.search` in `useEffect`. Dashboard home has an upgrade CTA banner (gradient card) for User role only. Payment proof upload uses existing `paymentRequestsApi.uploadReceipt` — same flow as other account types. After admin approval, account type is upgraded manually within 24h.
    - **Blog Module:** Full-stack blog system.
      - Backend: `IBlogService`/`BlogService`, `IBlogSlugService`/`BlogSlugService` (auto-increment collision), `BlogPostValidation`, `BlogPermissions`, `AdminBlogController` with per-action auth, soft delete with query filter. Public endpoints: `GET /api/blog/posts` (list), `GET /api/blog/posts/{slug}` (detail), `GET /api/blog/posts/{slug}/related?count=4` (related articles: same category → same tags → latest published, deduped via HashSet).
      - Frontend admin: list page with search/filter/pagination, create page, edit page (two-column form with publish/unpublish/archive/delete workflow), SEO tab (SeoTitleMode/SeoDescriptionMode/SlugMode: Auto/Template/Custom, live SERP preview with variable substitution), categories management page, `BlogStatusBadge`, `blogAdminApi`, dashboard NavCards.
      - Frontend public: blog list page (`/blog`), blog detail page (`/blog/[slug]`) — **Server Component** with `generateMetadata` (title, description, og:title, og:description, og:images). Server-side fetch via `src/lib/server-blog-api.ts` → `BACKEND_URL` using `new URL()` to avoid double-encoding Arabic slugs. `RelatedArticles.tsx` is a separate `"use client"` component for related posts loading. `.blog-content` CSS in `globals.css` for headings, lists, blockquotes, code, tables, images, hr.
      - Hydration fixes: `properties/[id]/page.tsx` uses `useState+useEffect` for `pageUrl`; `BlogPostForm.tsx` uses `dynamic(() => import("./RichTextEditor"), { ssr: false })`.
      - URL encoding note: `new URL(path_with_unicode, base)` is used for server-side fetch to avoid `encodeURIComponent` double-encoding (`%D8%AF` → `%25D8%25AF`) which causes ASP.NET Core to receive the literal percent-encoded string instead of the decoded Arabic slug.
    - **RBAC Dashboard Isolation (Broker fix):** Broker role is an INDIVIDUAL broker — not an Office/Company. Fixed: (1) Removed "الفريق" nav item from Broker sidebar (pointed to non-existent `/dashboard/team` page). (2) Removed `"Office"` from `SUMMARY_ROLES` (it is an `AccountType`, not a `UserRole`). (3) KPI cards "المشاريع" and "الوكلاء" in dashboard home are now conditional on `isCompanyOrAdmin` / `canManageAgents` respectively (hidden for Broker). (4) Added `canAccessTeam(role)` and `canAccessAgents(role)` helpers to `DashboardSidebar.tsx`. Route-level protection was already correct: `/dashboard/projects` has `allowedRoles: ["Admin","CompanyOwner"]`; `/dashboard/agents` redirects if `!hasPermission(user,"agents.manage")`.
    - **Multi-Level User Verification (Admin):** 4-enum system on `User` entity: `VerificationStatus` (None/Pending/Verified/Rejected, stored as TEXT), `VerificationLevel` (0-4, stored as int), `IdentityVerificationStatus` (None/Pending/Approved/Rejected, TEXT), `BusinessVerificationStatus` (None/Pending/Approved/Rejected, TEXT). Plus fields: `PhoneVerified`, `EmailVerified` (bool), `VerificationBadge`, `VerificationNotes`, `VerificationRejectionReason` (string?). All 9 columns added via `SchemaEvolutionService.TryAlter()`. Admin endpoints: `GET /api/admin/users/{id}/verification` → `UserVerificationResponse`, `PUT /api/admin/users/{id}/verification` ← `UpdateUserVerificationRequest` → returns updated `UserVerificationResponse`. `isVerified` (legacy bool) auto-syncs with `VerificationStatus == Verified`. Frontend: `UserVerificationPanel` component in admin users page with full form controls, status/level/identity/business dropdowns, phone/email checkboxes, badge/notes/rejection fields, save button calling PUT endpoint.
    - **Verification Request Workflow:** Full document submission & admin review cycle. Domain entities: `VerificationRequest` (Id, UserId, VerificationType TEXT, Status TEXT, SubmittedAt, ReviewedAt, ReviewedBy, UserNotes, AdminNotes, RejectionReason, CreatedAt, UpdatedAt) + `VerificationDocument` (Id, VerificationRequestId, DocumentType TEXT, FileName, FileUrl, MimeType, Status TEXT, Notes). Enums (stored as TEXT via `HasConversion<string>()`): `VerificationType` (Identity/Business/Both), `VerificationRequestStatus` (Draft/Submitted/Pending/UnderReview/NeedsMoreInfo/Approved/Rejected/Cancelled), `DocumentType` (NationalId/Passport/DriverLicense/CommercialRecord/TaxCertificate/PropertyDeed/Other), `DocumentStatus` (Pending/Accepted/Rejected). Tables created via `SchemaEvolutionService.ApplyVerificationRequestsPatchesAsync()` using `CREATE TABLE IF NOT EXISTS`. User API (`/api/verification/requests`): POST create, POST add document, POST submit, GET my requests, GET by id. Admin API (`/api/admin/verification/requests`): GET list (with status/type/search filters + pagination), GET by id, PUT review (drives `ApplyVerificationCore` on Approved → `isVerified=true`). Frontend: admin page at `/dashboard/admin/verification-requests` (table with filter/search, detail panel with document list + review form with decision/notes/rejection/verificationStatus/verificationLevel controls), user page at `/dashboard/verification` (expandable request cards, inline add-document + submit workflow, accordion detail view). Both sidebars updated: AdminSidebar + DashboardSidebar (all customer roles: User, Owner, Agent, Broker, CompanyOwner).
    - **CMS Lite (Phase 2A):** `SiteContent` entity (Key, Group, Type, LabelAr/En, ValueAr/En, IsActive, IsSystem, SortOrder). Public endpoint `GET /api/content/public` returns key→valueAr dict for active items. Admin CRUD at `GET/POST/PUT/DELETE /api/admin/content`. 18 default content items seeded on startup via `SiteContentSeeder` (covering home hero, navbar, footer, and general groups). Frontend: `ContentContext` + `useContent(key, fallback)` hook; `ContentProvider` wrapped in root layout; homepage hero (SLIDES[0]), Navbar (login/register), and Footer (about text/copyright) all read from CMS with fallbacks. Admin UI at `/dashboard/admin/content` with inline editing by group.
    - **Global Error Handling:** Consistent JSON responses for errors in Arabic.

**Key Design Decisions:**
- `ISoftDeletable` interface is used for logical deletion across several key entities.
- Query filters are applied at the EF Core level for `IsDeleted` and role-based access.
- GUID fragmentation is noted for potential future optimization with `Guid.CreateVersion7()`.
- **SQLite Guid storage:** EF Core 6+ / Microsoft.Data.Sqlite sends `Guid` parameters as BLOB (16 bytes) in LINQ queries. The raw-SQL seeder inserts them as TEXT (36-char lowercase UUID strings). Any entity whose IDs are seeded via raw SQL and then queried by PK via LINQ must use `HasConversion<string>()` in its entity configuration (see `OwnershipTypeConfiguration.cs`). This applies to `OwnershipTypeConfig`; other entities use EF Core migrations so their IDs are stored as BLOB and are consistent.
- The dashboard is integrated within the same Next.js app, not a separate application.

## External Dependencies

- **Database:**
    - `SQLite`: Used for local development and initial database setup.
    - `Microsoft.EntityFrameworkCore.SqlServer`: ORM for database interaction.
- **Authentication/Security:**
    - `BCrypt.Net-Next`: For password hashing.
    - `System.IdentityModel.Tokens.Jwt`: For JWT generation.
    - `Microsoft.AspNetCore.Authentication.JwtBearer`: For JWT token validation.
- **Payment Processing:**
    - `Stripe`: Integrated as a billing provider for handling online payments via Checkout Sessions and webhooks.
    - Internal Billing Provider: A manual bank transfer option, handled internally without external API.