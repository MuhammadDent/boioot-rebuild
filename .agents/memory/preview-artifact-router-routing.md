---
name: Preview artifact-router routing for legacy webview workflows
description: Why the workspace preview blanks / shows "Your Frontend artifact encountered an error" even when the dev server is healthy, and how to fix it.
---

# Workspace preview routing on the artifact-router platform

This repl runs on the artifact-router platform (`REPLIT_ARTIFACT_ROUTER` is set, the
router is an Express process that owns the dev domain) but serves its frontend the
legacy way: a plain workflow with `outputType = "webview"` on port 3000. No artifacts
are registered (`listArtifacts()` returns `[]`), and `.replit` may still carry stale
`[[artifacts]]` refs to dirs that don't exist.

## Symptom
- Workspace preview loads briefly then blanks; sometimes "Your Frontend artifact
  encountered an error". Localhost (port 3000) and the deployed `.replit.app` URL are fine.

## Diagnosis that actually discriminates the cause
- `curl -I http://localhost:3000/` → healthy app returns `x-powered-by: Next.js`, no
  `X-Frame-Options`/`CSP`, no redirect. So frame headers / HTTP→HTTPS / auth redirects
  are NOT the cause when these are absent.
- `curl -D - "https://$REPLIT_DEV_DOMAIN/"` → if this returns **404 with
  `x-powered-by: Express`**, that is the artifact-router's own 404: the router has no
  route for `/` and is NOT reaching the webview on port 3000. That mismatch is the
  real cause of the preview error, not anything in the app.

## Fix
- Restarting the **webview workflow** re-registers its route with the artifact-router.
  After restart, `https://$REPLIT_DEV_DOMAIN/` flips from Express 404 to **HTTP 200**
  served by Next.js, and the preview loads.

**Why:** the router's route to the legacy webview port can go stale (e.g. after a
botched restart or port churn); the workflow restart re-publishes it.

**How to apply:** when the preview is broken but port 3000 is 200, compare
`x-powered-by` on the direct port vs. the dev domain. Express-404 at the domain root =
stale router route → restart the webview workflow, then re-curl the dev domain to
confirm 200. Do NOT chase X-Frame-Options/CSP/redirects if the direct port headers are
already clean.
