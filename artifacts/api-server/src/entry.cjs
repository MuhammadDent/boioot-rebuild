"use strict";
// Production entry point for Replit deployment.
// Replit runs: node artifacts/api-server/dist/index.cjs
//
// Responsibilities:
//   1. Spawn the published .NET backend on BACKEND_PORT (5233)
//   2. Listen on PORT (set by Replit, typically 8080) and proxy all HTTP traffic to the backend
//
// __dirname here is: {workspace}/artifacts/api-server/dist/

const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

const PORT = Number(process.env.PORT) || 8080;
const BACKEND_PORT = 5233; // fixed internal port for the .NET backend

const WORKSPACE_ROOT = path.resolve(__dirname, "../../..");
const PUBLISH_BINARY = path.join(
  WORKSPACE_ROOT,
  "boioot/apps/backend/publish/Boioot.Api"
);
const DOTNET_ROOT =
  "/nix/store/1blv644vinali34masnw6g5fjjjaa4y6-dotnet-sdk-8.0.416/share/dotnet";

// ─── Start .NET backend ────────────────────────────────────────────────────────
const backend = spawn(PUBLISH_BINARY, [], {
  env: {
    ...process.env,
    // Tell Program.cs to bind on 5233, not on PORT (which is the proxy's port)
    DOTNET_PORT: String(BACKEND_PORT),
    ASPNETCORE_ENVIRONMENT: "Production",
    DOTNET_ROOT,
    PATH: `${DOTNET_ROOT}:${process.env.PATH || ""}`,
  },
  stdio: "inherit",
});

backend.on("error", (err) => {
  console.error("[api-server] Failed to start .NET backend:", err.message);
  process.exit(1);
});

backend.on("exit", (code) => {
  console.error(`[api-server] .NET backend exited with code ${code}`);
  process.exit(code ?? 1);
});

// ─── HTTP proxy ────────────────────────────────────────────────────────────────
const PROXY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const server = http.createServer((req, res) => {
  // Lightweight healthz for Replit's health probe (responds even while .NET boots)
  if (req.url === "/healthz" || req.url === "/workspace-api/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  const options = {
    hostname: "localhost",
    port: BACKEND_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `localhost:${BACKEND_PORT}` },
    timeout: PROXY_TIMEOUT_MS,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on("timeout", () => {
    proxyReq.destroy();
    if (!res.headersSent) {
      res.writeHead(504, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "gateway timeout" }));
    }
  });

  proxyReq.on("error", (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ error: "backend unavailable", detail: err.message })
      );
    }
  });

  req.pipe(proxyReq, { end: true });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `API proxy → http://0.0.0.0:${PORT}  ⟶  .NET backend :${BACKEND_PORT}`
  );
});
