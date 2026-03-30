"use strict";
// Minimal launcher required by Replit artifact system.
// Replit forces: node artifacts/api-server/dist/index.cjs
// This script immediately hands off to the .NET binary — no proxy, no HTTP
// forwarding. .NET binds directly to $PORT and handles all traffic.

const { spawnSync } = require("child_process");
const path = require("path");

const DOTNET_ROOT =
  "/nix/store/1blv644vinali34masnw6g5fjjjaa4y6-dotnet-sdk-8.0.416/share/dotnet";

// Build step publishes the DLL to {workspace}/out/ (same path the [deployment]
// block uses, so both artifact and direct-deployment modes are compatible).
const WORKSPACE = path.resolve(__dirname, "../../..");
const DLL = path.join(WORKSPACE, "out", "Boioot.Api.dll");
const PORT = process.env.PORT || "8080";

console.log(`[launcher] Starting .NET → dotnet ${DLL} on :${PORT}`);

const result = spawnSync("dotnet", [DLL], {
  stdio: "inherit",
  env: {
    ...process.env,
    DOTNET_ROOT,
    PATH: `${DOTNET_ROOT}:${process.env.PATH || ""}`,
    // DOTNET_PORT tells Program.cs which port to bind.
    // In production there is no proxy, so .NET binds directly to PORT.
    DOTNET_PORT: PORT,
  },
});

process.exit(result.status || 0);
