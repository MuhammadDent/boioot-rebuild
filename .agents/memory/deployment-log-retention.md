---
name: Deployment build-log retention / blank Publishing Logs page
description: Why the Publishing > Logs page can render blank, and how to tell retention-expiry apart from a real failure
---

# Blank Publishing "Logs" page = log retention, not corruption

Replit deployment **build logs are not retained indefinitely**. After the retention window, `getDeploymentBuild({buildId})` returns the build record intact (id, status, timestamps, user) but with `logs: []` (0 lines) — for BOTH failed and successful builds of the same era. The Publishing > Logs UI then renders blank because there are no stored log lines for that build.

**How to diagnose (don't guess which of: build-never-started / logs-unavailable / record-corrupted / platform-issue):**
- `getDeploymentInfo()` → is the app currently live & healthy (`isDeployed`, `hasSuccessfulBuild`, `primaryUrl`)? A stale "failed to publish <id>" banner can coexist with an older successful build still serving.
- `listDeploymentBuilds()` → build record present with status + a created→updated span proves the build *ran* (it didn't "never start").
- `getDeploymentBuild({buildId})` → `logs.length === 0` on an OLD build, AND 0 on a known-`success` build of the same age ⇒ retention expiry, not corruption.
- `fetchDeploymentLogs()` (runtime logs) → "No deployment logs found" when the failed build never promoted to serving (and/or runtime logs also aged out).

**Why:** build/runtime logs are only available for a recent window. An old failed publish therefore shows a blank Logs page by design.

**How to apply:** To get actionable logs for an old failure you cannot retrieve them — trigger a FRESH publish (not a code change) and capture logs in real time. But first check `getDeploymentInfo()`: if the live deployment is already healthy, the old failure may need no fix at all.
