---
name: .NET backend build/test under the 120s bash cap
description: How to compile Boioot.Api and run the xunit test project without blowing the bash tool's 2-minute timeout or losing dotnet output.
---

# Building & testing the Boioot .NET backend inside the agent

A full `dotnet build`/`dotnet test` of the solution does NOT finish inside the bash
tool's 120s cap — `Boioot.Infrastructure` + `Boioot.Api` are large and a cold Roslyn
compile exceeds the budget, so the tool kills it mid-build.

**Reliable recipe (only Api/Program/AuthController changed; Infrastructure untouched):**
1. Restart the `Boioot .NET API` workflow. `run-api.sh` rebuilds `Boioot.Api` via its
   normal path and its logs surface any compile error. This refreshes
   `src/Boioot.Api/bin/Debug/net8.0/Boioot.Api.dll` with your new types. Verify with
   `grep -c "<TypeName>" <that dll>` and compare its mtime to your source mtimes.
2. Build the test project WITHOUT rebuilding references (fast, ~6s):
   `dotnet build tests/Boioot.Api.Tests/... -p:BuildProjectReferences=false --no-restore -v minimal --tl:off /p:UseSharedCompilation=false /nodeReuse:false`
   This compiles only the test assembly against the already-built dependency DLLs.
3. Run tests without recompiling anything:
   `dotnet test tests/Boioot.Api.Tests/... --no-build --no-restore -v minimal --tl:off --logger "trx;LogFileName=/tmp/results.trx"`

**Output-capture gotcha:** the dotnet shared compiler server (VBCSCompiler) inherits and
holds the bash tool's stdout pipe, so the tool reports "no output" and blocks the full
timeout even when the build finished. **Always redirect dotnet output to a file**
(`> /tmp/x.txt 2>&1`, append `echo EXIT=$? >> /tmp/x.txt`) and read that file with the
`read` tool afterward — do NOT rely on trailing `tail`/`echo` to the tool's stdout.
`--tl:off /nodeReuse:false` reduce (but don't eliminate) the effect.

**run-api.sh fast-path staleness caution:** it can log "Binary is up-to-date — fast
path" and serve a STALE binary even when source `.cs` files are newer than the DLL
(observed: new files under `src/Boioot.Api/Security/` not triggering a rebuild). If you
need the running app to reflect fresh code, confirm the DLL mtime/type presence rather
than trusting the "up-to-date" log line; restart forces the rebuild.
