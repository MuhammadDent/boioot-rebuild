---
name: Uploads survive deploy only if committed
description: Why some /uploads images 404 in the autoscale deployment while others serve fine
---

Local-stored uploads only survive a deploy if the file is committed into the .NET project's
source `wwwroot/uploads` (and `wwwroot/uploads/thumbs`). Everything else is lost on redeploy.

**Why:**
- Object storage (R2) credentials are incomplete in the deployment → `IFileStorageService`
  falls back to `LocalFileStorageService`, which writes uploads to `{WebRootPath}/uploads/...`
  on the container's local disk.
- Autoscale filesystem is ephemeral and rebuilt from the deploy image on every
  redeploy/scale event, so runtime-written files do not persist.
- The deploy image is produced by `dotnet publish` → `out/`, and `out/` is **gitignored**
  (`.gitignore: /out/`). `dotnet publish` copies the project's committed `wwwroot/` into
  `out/wwwroot/`. So the ONLY upload files present in a fresh deployment are the ones
  committed under `boioot/apps/backend/src/Boioot.Api/wwwroot/uploads`.

**Result:** DB image columns store `/uploads/...` paths. Requests are proxied
Next → .NET static-file mount (`RequestPath="/uploads"`, Program.cs ~L462-482) which works
correctly (committed files return 200, incl. `/_next/image`). Uncommitted (runtime-uploaded)
paths 404, and `/_next/image` then returns 400 "not a valid image". Static serving is NOT
the bug — missing files are.

**How to apply:** When images 404 only for some `/uploads` paths, cross-check the DB path's
basename against `git ls-files .../wwwroot/uploads`. Missing ⇒ file was never committed.
Durable fixes: (a) configure R2/object storage so uploads persist off the ephemeral FS, or
(b) migrate DB refs to external URLs, or (c) commit the needed files into source `wwwroot/uploads`.
Do not "invent" replacement images.
