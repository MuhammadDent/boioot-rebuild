"use strict";
// Minimal launcher required by Replit artifact system.
// Replit forces: node artifacts/api-server/dist/index.cjs
// This script immediately hands off to the .NET binary — no proxy, no HTTP
// forwarding. .NET binds directly to $PORT and handles all traffic.

const { spawnSync } = require("child_process");
const path = require("path");

// Build step publishes the DLL to {workspace}/out/
const WORKSPACE = path.resolve(__dirname, "../../..");
const DLL = path.join(WORKSPACE, "out", "Boioot.Api.dll");
const PORT = process.env.PORT || "8080";

console.log(`[launcher] Starting .NET → dotnet ${DLL} on :${PORT}`);

if (!require("fs").existsSync(DLL)) {
  console.error(`[launcher] FATAL: DLL not found at ${DLL}`);
  process.exit(1);
}

// Do NOT override DOTNET_ROOT or PATH — the deployment container already has
// dotnet-8.0 on PATH via Replit modules.  Just tell Program.cs which port to use.
const result = spawnSync("dotnet", [DLL], {
  stdio: "inherit",
  env: {
    ...process.env,
    DOTNET_PORT: PORT,
    ASPNETCORE_ENVIRONMENT: "Production",
  },
});

process.exit(result.status || 0);
