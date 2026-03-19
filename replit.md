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
    - **Authentication & Authorization:** JWT-based authentication (register, login, user profile), BCrypt for password hashing, and role-based authorization (Admin, CompanyOwner, Broker, Agent, Owner, User).
    - **Entity Management:** 12 core entities with `ISoftDeletable` interface implemented for logical deletion (User, Company, Property, Project).
    - **Property Module:** Public listing/detail, CRUD operations for dashboard, pagination, filtering.
    - **Project Module:** Public listing/detail, CRUD operations for dashboard, `IsPublished` flag. Includes fields like `StartingPrice`, `DeliveryDate`, `Lat/Lon`.
    - **Requests/Leads Module:** Anonymous lead capture, dashboard management for requests with statuses (New, Contacted, Qualified, Closed).
    - **Role Management:** Support for various user roles with specific permissions, including Broker managing Agents.
    - **Subscription Module:** Management of plans, accounts, subscriptions, and invoices. Supports multiple billing providers.
    - **Blog Module:** Full-stack blog system.
      - Backend: `IBlogService`/`BlogService`, `IBlogSlugService`/`BlogSlugService` (auto-increment collision), `BlogPostValidation`, `BlogPermissions`, `AdminBlogController` with per-action auth, soft delete with query filter. Public endpoints: `GET /api/blog/posts` (list), `GET /api/blog/posts/{slug}` (detail), `GET /api/blog/posts/{slug}/related?count=4` (related articles: same category → same tags → latest published, deduped via HashSet).
      - Frontend admin: list page with search/filter/pagination, create page, edit page (two-column form with publish/unpublish/archive/delete workflow), SEO tab (SeoTitleMode/SeoDescriptionMode/SlugMode: Auto/Template/Custom, live SERP preview with variable substitution), categories management page, `BlogStatusBadge`, `blogAdminApi`, dashboard NavCards.
      - Frontend public: blog list page (`/blog`), blog detail page (`/blog/[slug]`) with HTML content via `dangerouslySetInnerHTML`, client-side SEO (`useEffect` → `document.title` + meta description), `RelatedCard` component, related articles section. `.blog-content` CSS in `globals.css` for headings, lists, blockquotes, code, tables, images, hr.
      - Hydration fixes: `properties/[id]/page.tsx` uses `useState+useEffect` for `pageUrl`; `BlogPostForm.tsx` uses `dynamic(() => import("./RichTextEditor"), { ssr: false })`.
    - **Global Error Handling:** Consistent JSON responses for errors in Arabic.

**Key Design Decisions:**
- `ISoftDeletable` interface is used for logical deletion across several key entities.
- Query filters are applied at the EF Core level for `IsDeleted` and role-based access.
- GUID fragmentation is noted for potential future optimization with `Guid.CreateVersion7()`.
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