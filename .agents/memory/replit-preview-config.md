---
name: Replit preview / .replit config model
description: How this repl's preview is wired (legacy webview vs artifact system) and the tooling constraints around .replit
---

# Replit preview & `.replit` config for this repl

This repl mixes the **legacy webview model** with the **new PNPM_WORKSPACE artifact stack**, and that mix is the source of preview confusion.

- Frontend (Next.js) is served by the **`Boioot Frontend` webview workflow** (`outputType = webview`, `waitForPort = 3000`), NOT as a registered artifact. Backend is the `Boioot .NET API` console workflow (`waitForPort = 8080`). `.replit` uses manual `[[ports]]` (3000→3000, 8080→8080); there is **no externalPort 80** mapping.
- `.replit` still contains stale `[[artifacts]]` entries (`artifacts/api-server`, `artifacts/mockup-sandbox`) pointing to **directories that don't exist**. The live registry is empty (`listArtifacts() → []`, no `artifact.toml` anywhere), so these entries are **inert** — the preview pane shows the *webview workflow itself* as the "artifact".

**Tooling constraints (important):**
- **Direct edits to `.replit` are blocked** by the platform — each setting is owned by a specific tool (workflows via `configureWorkflow`/`removeWorkflow`, etc.).
- There is **no artifact-removal callback** (`removeArtifact`/`deleteArtifact`/`unregisterArtifact` are all undefined). So the stale `[[artifacts]]` lines cannot be deleted with available tools.

**Why:** "Your Boioot Frontend artifact encountered an error" is a preview/proxy-layer message (the iframe failed to load), NOT an app failure — both servers return 200 directly on localhost. A clean `restart_workflow` of `Boioot Frontend` clears the stale webview state and the routes serve 200 again.

**How to apply:** Diagnose preview issues at the proxy layer, not the app. In-container `curl` to `$REPLIT_DEV_DOMAIN` times out with HTTP 000 due to the mTLS edge — that is NOT proof the proxy is down; verify via the user's browser hard-refresh instead. If the root preview URL stays blank after a restart, the next lever is mapping the frontend to `externalPort 80` (only one port may use 80).
