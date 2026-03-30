"use strict";
// Production launcher for Replit Autoscale.
//
// ARCHITECTURE:
//   Replit → node dist/index.cjs  (PORT assigned by Replit)
//   node   → listens on PORT immediately  (satisfies Replit's port-ready check)
//   node   → spawns dotnet on DOTNET_PORT (PORT+1, internal)
//   node   → HTTP-proxies all traffic PORT → DOTNET_PORT
//
// Why the proxy?  .NET's startup (DB init, seeding) takes 5-30 s before
// app.Run() binds to its port.  If node delegated the port binding to .NET
// directly (spawnSync approach), Replit's "waiting for ports" check would
// time out before .NET is ready.  By having node bind immediately and proxy
// to .NET once it is up, the port check passes and health retries handle
// the remaining startup window.

const http     = require("http");
const { spawn, execSync } = require("child_process");
const path     = require("path");
const fs       = require("fs");

// PORT is assigned dynamically by Replit Autoscale — do NOT hardcode.
const PORT       = parseInt(process.env.PORT || "8080", 10);
const DOTNET_PORT = PORT + 1;

const WORKSPACE = path.resolve(__dirname, "../../..");
const DLL       = path.join(WORKSPACE, "out", "Boioot.Api.dll");

console.log(`[launcher] PORT=${PORT}  DOTNET_PORT=${DOTNET_PORT}  DLL=${DLL}`);

if (!fs.existsSync(DLL)) {
  console.error(`[launcher] FATAL: DLL not found at ${DLL}`);
  try {
    const outDir = path.join(WORKSPACE, "out");
    if (fs.existsSync(outDir))
      console.error("[launcher] out/ contents:", fs.readdirSync(outDir).join(", "));
    else
      console.error("[launcher] out/ directory does not exist");
  } catch {}
  process.exit(1);
}

// ── Locate dotnet binary ───────────────────────────────────────────────────
function findDotnet() {
  try {
    const bin = execSync("which dotnet 2>/dev/null", { encoding: "utf8" }).trim();
    if (bin) return { bin, root: null };
  } catch {}
  // Fallback: Nix store path used by build-prod.sh in the same container.
  const nixRoot = "/nix/store/1blv644vinali34masnw6g5fjjjaa4y6-dotnet-sdk-8.0.416/share/dotnet";
  const nixBin  = path.join(nixRoot, "dotnet");
  if (fs.existsSync(nixBin)) return { bin: nixBin, root: nixRoot };
  return { bin: "dotnet", root: null };
}

const { bin: dotnetBin, root: dotnetRoot } = findDotnet();
console.log(`[launcher] dotnet=${dotnetBin}`);

const dotnetEnv = {
  ...process.env,
  DOTNET_PORT: String(DOTNET_PORT),
  ASPNETCORE_ENVIRONMENT: "Production",
};
if (dotnetRoot) {
  dotnetEnv.DOTNET_ROOT = dotnetRoot;
  dotnetEnv.PATH = `${dotnetRoot}:${process.env.PATH || ""}`;
}

// ── Start .NET process (async) ─────────────────────────────────────────────
const child = spawn(dotnetBin, [DLL], { stdio: "inherit", env: dotnetEnv });

child.on("error", (err) => {
  console.error("[launcher] Failed to start dotnet:", err.message);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  console.log(`[launcher] .NET exited  code=${code}  signal=${signal}`);
  process.exit(code ?? 0);
});

// ── HTTP proxy: node owns PORT, forwards everything to .NET ────────────────
const server = http.createServer((req, res) => {
  const options = {
    hostname: "127.0.0.1",
    port:     DOTNET_PORT,
    path:     req.url,
    method:   req.method,
    headers:  { ...req.headers, host: `127.0.0.1:${DOTNET_PORT}` },
  };

  const proxy = http.request(options, (backendRes) => {
    res.writeHead(backendRes.statusCode, backendRes.headers);
    backendRes.pipe(res, { end: true });
  });

  proxy.on("error", (err) => {
    if (!res.headersSent) {
      res.writeHead(502);
      res.end(`[launcher] .NET not ready: ${err.message}`);
    }
  });

  req.pipe(proxy, { end: true });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[launcher] Node proxy :${PORT} → .NET :${DOTNET_PORT}  (ready)`);
});

// Keep the process alive even if dotnet exits abnormally.
process.on("SIGTERM", () => { child.kill("SIGTERM"); server.close(); });
process.on("SIGINT",  () => { child.kill("SIGINT");  server.close(); });
