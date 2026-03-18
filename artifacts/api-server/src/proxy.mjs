import http from "http";

const PORT = Number(process.env.PORT) || 8080;
const BACKEND_HOST = "localhost";
const BACKEND_PORT = 5233;

// 5 minutes — enough for large image payloads
const PROXY_TIMEOUT_MS = 5 * 60 * 1000;

const server = http.createServer((req, res) => {
  if (req.url === "/healthz" || req.url === "/api/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  const options = {
    hostname: BACKEND_HOST,
    port: BACKEND_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `${BACKEND_HOST}:${BACKEND_PORT}` },
    timeout: PROXY_TIMEOUT_MS,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode ?? 500, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on("timeout", () => {
    proxyReq.destroy();
    if (!res.headersSent) {
      res.writeHead(504, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "انتهت مهلة الخادم — حاول مجدداً" }));
    }
  });

  proxyReq.on("error", (err) => {
    console.error(`Proxy error [${req.method} ${req.url}]:`, err.message);
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "الخادم غير متاح حالياً" }));
    }
  });

  req.pipe(proxyReq);
});

server.timeout = PROXY_TIMEOUT_MS;

server.listen(PORT, () => {
  console.log(`API proxy → http://localhost:${PORT}  ⟶  .NET backend :${BACKEND_PORT}`);
});
