// Development-only HTTP proxy.
// Listens on PORT (Replit preview port, default 8080) and forwards all requests
// to the .NET backend on DOTNET_PORT (default 5233).
// This file is NOT used in production — production runs .NET directly on PORT.
import http from "http";

const PROXY_PORT   = parseInt(process.env.PORT       || "8080", 10);
const BACKEND_PORT = parseInt(process.env.DOTNET_PORT || "5233", 10);

const server = http.createServer((req, res) => {
  const options = {
    hostname: "127.0.0.1",
    port: BACKEND_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };

  const proxy = http.request(options, (backendRes) => {
    res.writeHead(backendRes.statusCode, backendRes.headers);
    backendRes.pipe(res, { end: true });
  });

  proxy.on("error", (err) => {
    if (!res.headersSent) {
      res.writeHead(502);
      res.end(`Proxy error: ${err.message}`);
    }
  });

  req.pipe(proxy, { end: true });
});

server.listen(PROXY_PORT, "0.0.0.0", () => {
  console.log(`[proxy] :${PROXY_PORT} → .NET :${BACKEND_PORT}`);
});
