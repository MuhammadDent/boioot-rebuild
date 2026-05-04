# Boioot — منصة العقارات السورية

## Overview
Boioot is a Syrian real estate platform designed to connect buyers and sellers, featuring a public marketplace, a user dashboard, and an administration panel. Its primary goal is to become the leading Arabic-first real estate solution in Syria by offering comprehensive tools for property listings, project showcases, lead management, and future plans for advanced subscription models and robust billing integrations.

## User Preferences
I prefer simple language. I want iterative development. Ask before making major changes.
- Safe Mode for backend/production-like work is mandatory: additive-only changes, no existing API contract changes, no auth/middleware changes, no schema changes already in use, no unrelated refactors, no frontend logic changes unless explicitly requested.
- New backend functionality should be isolated in new services/modules/controllers where possible and integrated only after existing logic, preserving current behavior.
- Notification matching/creation must never block or slow down the original user flow; run it as a post-success background side-effect and swallow/log failures.
- Before delivering backend changes, validate that existing critical flows remain unaffected: listings, requests, image uploads, verification, subscriptions, and authentication.

## System Architecture

**Frontend:**
- **Technology:** Next.js 16 (App Router, TypeScript).
- **UI/UX:** Arabic-first, Right-to-Left (RTL) design using Tailwind CSS with a primary green color (`#2E7D32`). Features include public listings, user/admin dashboards, inquiry forms, dynamic pricing, subscription management, and a full-stack blog. Conditional rendering based on user roles and responsive design are key.
- **Image Optimization:** Utilizes Next.js image optimization for property/project listings and user avatars, with lazy loading and optimized cache headers.
- **Routing:** All API calls are proxied through Next.js rewrites from `/api/*` to the .NET backend.

**Backend:**
- **Technology:** ASP.NET Core Web API (.NET 8) with a Modular Monolith architecture.
- **Database:** PostgreSQL (production) with EF Core. SQLite is supported for local development.
- **Authentication & Authorization:** JWT-based with HttpOnly refresh tokens, BCrypt hashing, and role-based access control (Admin, CompanyOwner, Broker, Agent, Owner, User).
- **Core Features:**
    - **Entity Management:** Logical deletion (`ISoftDeletable`) for core entities.
    - **Property & Project Modules:** CRUD operations, public listings, pagination, filtering.
    - **Requests/Leads Module:** Anonymous lead capture and dashboard management.
    - **Rating/Reviews System (Booking-Based):** Multi-criteria review system for `TenantToProperty` and `OwnerToTenant` tied to Confirmed/Completed bookings. Includes admin settings for public visibility.
    - **Booking Flow:** Manual owner-approval workflow for daily rentals with a defined status lifecycle (`PendingApproval` to `Confirmed`). Supports payment proof submission.
    - **Subscription Module:** Manages plans, accounts, subscriptions, and invoicing, including user role upgrade flows.
    - **Blog Module:** Full-stack blog with admin CRUD and SEO features.
    - **Unified Reference Numbers:** Human-readable, sequentially generated reference numbers for key administrative entities (e.g., `USR-YYYY-000001`).
    - **Multi-Level User Verification:** Comprehensive identity and business verification with admin review workflows.
    - **In-App Notifications:** Real-time notifications via a private SignalR hub for various activities (requests, verification, subscriptions, buyer-match alerts), with a REST API fallback. Notifications are templated and have a centralized frontend rendering.
    - **CMS Lite:** `SiteContent` entity for managing static content.
    - **User Image Module:** Handles image uploads to Cloudflare R2, storing URLs and file keys in the database. Provides endpoints for uploading, retrieving, and deleting user-specific images.
    - **Location Suggestion Flow:** Allows users to suggest new cities/neighborhoods via a dedicated endpoint and modal, which are then stored for admin approval.
    - **Plan-Based Access Control (PBAC):** Frontend-driven feature gating and limit enforcement based on subscription plans.
- **Global Error Handling:** Consistent, localized JSON error responses without exposing stack traces.
- **Performance Optimizations:** Utilizes `IMemoryCache` for frequently accessed data (cities, provinces, options) and composite indexes on PostgreSQL for improved query performance. `Select()` projections are used in services to reduce data loaded.

**Key Design Decisions:**
- Logical deletion and EF Core query filters for soft deletes and role-based access.
- Integrated dashboard within the Next.js application for a unified user experience.
- Consistent UI components (`EmptyState`, `ErrorState`, `InlineBanner`) and error normalization on the frontend.
- Environment-based CORS configuration for production readiness.

## External Dependencies

- **Database:**
    - `Npgsql.EntityFrameworkCore.PostgreSQL`: PostgreSQL provider.
    - `Microsoft.EntityFrameworkCore.Sqlite`: For local development.
    - `Microsoft.EntityFrameworkCore.SqlServer`: ORM for database interaction.
- **Authentication/Security:**
    - `BCrypt.Net-Next`: Password hashing.
    - `System.IdentityModel.Tokens.Jwt`: JWT generation.
    - `Microsoft.AspNetCore.Authentication.JwtBearer`: JWT validation.
- **Realtime:**
    - `@microsoft/signalr`: Frontend SignalR client for real-time notifications.
- **Payment Processing:**
    - `Stripe`: For online payments (Checkout Sessions, webhooks).
    - Internal Billing Provider: Supports manual bank transfers.