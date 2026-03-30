"use strict";
// Minimal launcher required by Replit artifact system.
// Replit forces: node artifacts/api-server/dist/index.cjs
// This script immediately hands off to the .NET binary — no proxy, no HTTP
// forwarding. .NET binds directly to $PORT and handles all traffic.

const { spawnSync, execSync } = require("child_process");
const path = require("path");
const fs   = require("fs");

// Replit Autoscale sets PORT dynamically — never hardcode a default port in
// artifact.toml's run.env.  Read PORT from the environment Replit provides.
const PORT = process.env.PORT || "8080";

// Build step publishes the DLL to {workspace}/out/
const WORKSPACE = path.resolve(__dirname, "../../..");
const DLL       = path.join(WORKSPACE, "out", "Boioot.Api.dll");

console.log(`[launcher] PORT=${PORT}  DLL=${DLL}`);

if (!fs.existsSync(DLL)) {
  console.error(`[launcher] FATAL: DLL not found at ${DLL}`);
  console.error(`[launcher] Workspace: ${WORKSPACE}`);
  try { console.error("[launcher] out/ contents:", fs.readdirSync(path.join(WORKSPACE, "out")).join(", ")); } catch {}
  process.exit(1);
}

// Locate dotnet binary — try PATH first, then the known Nix store path used by build-prod.sh.
function findDotnet() {
  try {
    const bin = execSync("which dotnet 2>/dev/null", { encoding: "utf8" }).trim();
    if (bin) return { bin, root: null };
  } catch {}

  // Fallback: Nix store path used by the build container (same Nix profile).
  const nixRoot = "/nix/store/1blv644vinali34masnw6g5fjjjaa4y6-dotnet-sdk-8.0.416/share/dotnet";
  const nixBin  = path.join(nixRoot, "dotnet");
  if (fs.existsSync(nixBin)) return { bin: nixBin, root: nixRoot };

  // Last resort — let the OS resolve it and fail loudly.
  return { bin: "dotnet", root: null };
}

const { bin: dotnetBin, root: dotnetRoot } = findDotnet();
console.log(`[launcher] dotnet=${dotnetBin}`);

const env = {
  ...process.env,
  DOTNET_PORT: PORT,
  ASPNETCORE_ENVIRONMENT: "Production",
};
if (dotnetRoot) {
  env.DOTNET_ROOT = dotnetRoot;
  env.PATH = `${dotnetRoot}:${process.env.PATH || ""}`;
}

const result = spawnSync(dotnetBin, [DLL], { stdio: "inherit", env });

if (result.error) {
  console.error("[launcher] Failed to start dotnet:", result.error.message);
  process.exit(1);
}

process.exit(result.status || 0);
