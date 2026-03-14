# Workspace

## Overview

This project contains two parts:
1. **Boioot Backend** — ASP.NET Core 8 Web API (primary backend being built)
2. **pnpm workspace monorepo** — TypeScript scaffolding (existing placeholder)

---

## Boioot Backend (.NET 8)

### Description
Boioot is an Arabic-first RTL real estate marketplace + SaaS platform targeting Saudi Arabia & Syria. Combines features from Airbnb, Zillow, and Property Finder. 6 user types: Guest, User, Owner, Agent, CompanyOwner, Admin.

### Stack
- **Runtime**: .NET 8 / ASP.NET Core Web API
- **Database**: PostgreSQL via EF Core 8 + Npgsql
- **Auth**: JWT Bearer tokens
- **API Docs**: Swagger / Swashbuckle 6.x
- **Storage**: Cloudinary (images) — abstracted via IFileStorageService
- **Architecture**: Modular Monolith (Domain / Application / Infrastructure / API / Shared)

### Project Location
`backend/` — `Boioot.sln`

### Key Files
- `backend/src/Boioot.API/Program.cs` — Entry point, DI configuration
- `backend/src/Boioot.API/appsettings.json` — App configuration
- `backend/src/Boioot.Infrastructure/Persistence/ApplicationDbContext.cs` — EF Core DbContext
- `backend/src/Boioot.Infrastructure/Persistence/Migrations/` — Database migrations
- `backend/run-api.sh` — Run script (reads PORT env var)

### Running the API
```bash
# Workflow: "Boioot .NET API" on port 8000
bash backend/run-api.sh

# Or for migrations:
export DOTNET_ROOT="/nix/store/1blv644vinali34masnw6g5fjjjaa4y6-dotnet-sdk-8.0.416/share/dotnet"
export PATH="$PATH:/home/runner/.dotnet/tools"
dotnet ef database update --project backend/src/Boioot.Infrastructure --startup-project backend/src/Boioot.API
```

### Database Tables (18 entities)
Users, Companies, Agents, Properties, PropertyImages, PropertyFeatures, Projects, ProjectImages, PropertyRequests, RequestResponses, Reviews, Favorites, Conversations, Messages, Notifications, BlogPosts, SubscriptionPlans, CompanySubscriptions

### Brand Colors
- Primary: `#2E7D32` (dark green)
- Secondary: `#A5D6A7` / `#C8E6C9` (light green)
- Background: `#F5F5F5` (light gray)
- Text: `#212121`

### Implementation Phases
- ✅ Phase 1: Foundation (Domain entities, Shared patterns, Infrastructure DbContext, API Program.cs + middleware)
- 🔄 Phase 2: Identity & Users (Auth, JWT, Roles) — NEXT
- ⏳ Phase 3: Companies & Agents
- ⏳ Phase 4: Properties
- ⏳ Phase 5: Projects
- ⏳ Phase 6: Requests
- ⏳ Phase 7: Reviews & Favorites
- ⏳ Phase 8: Messages
- ⏳ Phase 9: Blog
- ⏳ Phase 10: Notifications & Admin

---

## pnpm Monorepo (TypeScript placeholder)

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
