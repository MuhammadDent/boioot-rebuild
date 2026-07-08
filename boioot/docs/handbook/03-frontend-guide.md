# 03 · Frontend Guide

## Topic A — Routing & application structure

### 1. What exists in Boioot 🟢

Next.js 16 App Router (`boioot/apps/frontend/src/app/`):

- **Route groups**: `(public)/(home)` → `/`; `(public)/(pages)/*` → ~16 public pages (`properties[/[id]]`, `projects[/[id]]`, `agencies[/[id]]`, `blog[/[slug]]`, `requests[/[id]]`, `daily-rentals`, `pricing`, `faq`, `about`, `contact`, `privacy-policy`, `terms`, `usage-policy`, `post-ad`, `special-requests`).
- **Auth routes** at root: `/login`, `/register`, `/forgot-password`, `/onboarding`, `/notifications`.
- **Dashboard**: `/dashboard/*` — ~20 customer sections (listings, bookings, leads, matching, messages, subscription, verification…).
- **Admin**: `/dashboard/admin/*` — ~34 back-office sections (plans, billing, verification-requests, RBAC roles, site settings…).
- **Route handlers**: a few `app/api/*` helpers (agencies aggregation, public settings) plus `app/sitemap.xml/route.ts`; `app/robots.ts`.
- Source layout: `src/{app,components,context,features,hooks,lib,services,styles,types}`.

### 2. Why this approach

- Route groups give each surface (public vs dashboard) its own layout shell without leaking URL segments.
- Filesystem routing = the route map *is* the documentation; the 34 admin folders mirror the 15 Admin* API controllers nearly 1:1 — easy mental mapping.

### 3. Modern alternatives

- Pages Router (legacy Next), React Router/TanStack Router SPA, Remix-style loaders/actions, Astro/islands for content-heavy sites.

### 4. When to use each

- App Router: default for new Next work — layouts, server components, metadata routes.
- SPA routers: when there's no SSR/SEO need (pure dashboards behind login).
- Astro/islands: marketing/content sites where JS should be near zero.

---

## Topic B — Data fetching & backend communication

### 1. What exists in Boioot 🟢

- **No axios, no React Query, no SWR.** A custom `request` wrapper over `fetch` in `src/lib/api.ts` with: error normalization, 401 interception, and **preemptive silent token refresh**.
- Service layer: `src/services/*.service.ts` (auth, images, properties…) and per-feature `api.ts` files under `src/features/*`.
- Server components (root `layout.tsx`, `IntegrationHead.tsx`) fetch the backend **directly** via `BACKEND_URL`; client components go through the `/api` rewrite proxy (same origin).
- SignalR (`/hubs/*`) proxied for realtime notifications.

### 2. Why this approach

- One wrapper = one place for auth headers, refresh, and error shape; no dependency lock-in.
- The rewrite proxy means client code uses relative URLs — no CORS, no env-specific base URLs in the browser bundle.
- Direct server-side fetches avoid a pointless loop through the proxy for SSR.

### 3. Modern alternatives

- **TanStack Query / SWR**: cache, dedupe, revalidation, optimistic updates.
- **Server Actions** for mutations; **tRPC** for end-to-end types with a TS backend (not applicable to a .NET backend); **OpenAPI codegen** clients (applicable — the API has Swagger).

### 4. When to use each

- Custom fetch wrapper: fine while data needs are page-scoped and simple.
- Adopt TanStack Query when you see: duplicated loading/error state, manual refetch-after-mutate bugs, or cross-component cache needs. Most dashboards cross that line.
- 🟡 **Recommendation**: generate a typed client from the existing Swagger spec — the backend already publishes one; hand-written DTO types in `src/types` can silently drift.

---

## Topic C — State management & auth on the client

### 1. What exists in Boioot 🟢

- React Context only (no Redux/Zustand): `AuthContext`, `AuthGateContext`, `SiteSettingsContext`, `SubscriptionContext`, `ContentContext`, `AdminNotificationsContext` (`src/context/`), nested in that order in the root layout.
- Token model: **access token (15 min) in `localStorage`** (`boioot_token`, `src/lib/token.ts`) + **refresh token in an HttpOnly cookie** scoped to `/api/auth`; silent refresh in `src/lib/api.ts`.
- Route protection: **layout guards**, not middleware — `src/app/dashboard/layout.tsx` and `dashboard/admin/layout.tsx` redirect unauthenticated users and enforce role/permission zones. There is **no `middleware.ts`** (not implemented).

### 2. Why this approach

- Context suffices because most state is "session-shaped" (who am I, what's my plan, site settings) — low-frequency, app-wide reads.
- The split token model is a deliberate compromise: refresh token is XSS-safe (HttpOnly), while the short-lived access token in localStorage keeps the API stateless-JWT with a 15-minute XSS blast radius.

### 3. Modern alternatives

- All-cookie sessions (BFF pattern — tokens never touch JS; strongest against XSS).
- In-memory access token (lost on reload; silent refresh restores it — no storage exposure).
- Edge `middleware.ts` guards — redirect *before* any page code ships to the browser.
- Zustand/Jotai for high-frequency client state; Redux Toolkit for large teams needing strict conventions.

### 4. When to use each

- Layout guards vs middleware: guards are simpler and colocated; middleware is stronger (no flash of protected UI, works for non-React assets). Use middleware when protected content must never render even momentarily.
- localStorage tokens are acceptable **only** with short lifetimes + strict CSP; prefer HttpOnly-cookie-only (BFF) for anything high-stakes (FinTech, Healthcare — see chapter 08).

---

## Topic D — Styling, RTL, and SEO

### 1. What exists in Boioot 🟢

- Tailwind CSS v4; design tokens as CSS variables in `globals.css` / `src/styles/theme.css`; Google font **Cairo** via `next/font`.
- RTL: `<html lang="ar" dir="rtl">` hardcoded in root `layout.tsx`. **No i18n framework** — the product is single-language Arabic by design.
- SEO surface: Metadata API in `layout.tsx` (title/description/OG/Twitter), `robots.ts`, dynamic `sitemap.xml/route.ts` (crawls public properties + blog via the API, canonical `https://boioot.com`, degrades to static URLs on backend failure), analytics loaders (`src/components/integrations/IntegrationHead.tsx`: GA4/GTM/Meta/TikTok/Snap, config-driven from backend settings).
- `next.config.ts`: security headers on all routes, rewrites, `poweredByHeader: false`, images `avif/webp` — and `typescript.ignoreBuildErrors: true` ⚠️.

### 2. Why this approach

- `dir="rtl"` at the root + Tailwind logical utilities is the lowest-cost way to build RTL-first (vs retrofitting RTL onto an LTR codebase, which is notoriously painful).
- Config-driven analytics means marketing pixels are managed from the admin panel, not deploys.

### 3. Modern alternatives

- next-intl / i18next when a second language arrives; CSS logical properties everywhere; shadcn/ui-style component libraries; type-checked builds in CI.

### 4. When to use each

- Single-market products: hardcode locale/direction like Boioot — an i18n framework has real complexity cost; add it when the second language is *actually planned*.
- 🟡 **Recommendation**: remove `ignoreBuildErrors: true` and fix outstanding TS errors — a type-unchecked production build silently converts compile-time errors into runtime errors. This is the highest-value frontend hardening available.

---

## Advantages & limitations of Boioot's choices

| Topic | Advantages 🟢 | Limitations 🟢 |
|---|---|---|
| App Router + route groups | Route map mirrors the product; per-audience layouts; metadata/SEO routes built in | Deep admin tree (34 sections) means many small pages to maintain by hand |
| Custom fetch wrapper (no query lib) | No dependency lock-in; one place for auth/refresh/errors | No cache/dedupe/revalidation — every page refetches; manual loading/error state repetition grows with the app |
| Context-only state | Simple; matches session-shaped state | Any high-frequency state would re-render whole subtrees; no devtools/time-travel |
| Split token model (localStorage access + HttpOnly refresh) | Stateless API calls; XSS blast radius capped at 15 min | Access token still JS-readable; weaker than a full BFF cookie model for high-stakes domains |
| Layout guards (no middleware.ts) | Colocated with the section they protect; simple mental model | Protected shells can flash before redirect; no edge-level enforcement for non-React assets |
| Hardcoded `lang="ar" dir="rtl"` | Zero i18n complexity; RTL correctness by default | Adding a second locale later requires threading an i18n framework through every page |

## Lessons learned

1. **RTL-first beats RTL-retrofit.** Boioot never pays the "flip the layout" tax because direction was a day-one constraint.
2. **A proxy rewrite is a contract**: root-relative `/api` URLs work *because* `next.config.ts` guarantees them — any new artifact/path scheme must preserve it.
3. **Metadata routes vs explicit routes** (from this project's sitemap history): both work in production builds; a prod 404 for a route that exists locally means the *deployment* is stale, not the code — check `git branch -vv` before rewriting code.
4. **Silent refresh needs one owner**: centralizing 401-handling in `lib/api.ts` prevents the classic "every component retries auth differently" mess.

## Common mistakes

- Shipping with `ignoreBuildErrors`/`ignoreDuringBuilds` "temporarily" — it never gets removed.
- Storing long-lived tokens in localStorage (Boioot mitigates with 15-min expiry; many apps don't).
- Adding Redux to apps whose state is session-shaped.
- Hand-maintaining API types that drift from the backend contract.

## Best practices

- One fetch wrapper owning auth, refresh, and error normalization.
- Route groups per audience; guards at the layout that owns the section.
- Design tokens as CSS variables so theming stays in one file.
- SEO endpoints must never 500: degrade to static content on upstream failure (Boioot's sitemap does exactly this).

## Rules to remember

- **The browser should only ever see relative URLs** when a proxy exists.
- **HttpOnly for anything long-lived; short TTL for anything JS-readable.**
- **`dir` and `lang` are architecture, not styling.**
- **A skipped type check is a deferred production incident.**

## Checklist for future projects

- [ ] Decide token storage model (BFF cookie vs split) before writing login
- [ ] One API client wrapper; no raw `fetch` in components
- [ ] Layout guards (or middleware) per protected section
- [ ] `lang`/`dir` correct at the root from day one
- [ ] robots + sitemap + metadata before launch, with fallback-on-failure
- [ ] Type checking enforced in the production build
- [ ] Analytics config-driven, not hardcoded
