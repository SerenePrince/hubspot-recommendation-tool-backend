const http = require("node:http");
const { URL } = require("node:url");
const { randomUUID } = require("node:crypto");

const { handleAnalyze } = require("./routes/analyze");
const { initTechDb } = require("../core/analyzer");
const { config } = require("../core/config");

// Keep the API intentionally small: /health and /analyze.

function setSecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  // Not setting CSP here because this is an API, not serving HTML.
}

function setCors(req, res) {
  // Minimal CORS primarily for local dev + simple deployments.
  // If you deploy behind a reverse proxy, tighten this there or via config.
  const origin = req.headers.origin;

  if (config.cors.allowOrigin === "*" || !origin) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (origin === config.cors.allowOrigin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, X-Request-Id");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function sendJson(res, status, payload, pretty) {
  const body = pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(body);
}

function getPretty(requestUrl) {
  const v = requestUrl.searchParams.get("pretty");
  return v === "1" || v === "true";
}

function logRequest(req, res, requestUrl, requestId, startMs) {
  if (!config.logging.requestLog) return;

  const ms = Date.now() - startMs;
  const msg = {
    level: "info",
    msg: "request",
    requestId,
    method: req.method,
    path: requestUrl.pathname,
    statusCode: res.statusCode,
    durationMs: ms,
  };
  // Structured logs (JSON) play well with container logging.
  console.log(JSON.stringify(msg));
}

const server = http.createServer(async (req, res) => {
  const startMs = Date.now();
  const host = req.headers.host || "localhost";

  // Generate or propagate request id
  const requestId = (req.headers["x-request-id"] && String(req.headers["x-request-id"])) || randomUUID();
  res.setHeader("X-Request-Id", requestId);

  try {
    setSecurityHeaders(res);
    setCors(req, res);

    // Handle preflight quickly.
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    // Parse URL safely (works behind proxies too).
    const requestUrl = new URL(req.url || "/", `http://${host}`);
    const pretty = getPretty(requestUrl);

    if (req.method === "GET" && requestUrl.pathname === "/health") {
      sendJson(res, 200, { ok: true, service: "HubSpot Recommendation Tool API" }, pretty);
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/analyze") {
      await handleAnalyze(req, res, requestUrl);
      return;
    }

    sendJson(res, 404, { ok: false, error: "Not found" }, pretty);
  } catch (err) {
    const safeMessage =
      config.env === "production"
        ? "Internal server error"
        : (err && (err.message || String(err))) || "Unknown error";

    sendJson(res, 500, { ok: false, error: safeMessage }, false);
  } finally {
    try {
      const requestUrl = new URL(req.url || "/", `http://${host}`);
      logRequest(req, res, requestUrl, requestId, startMs);
    } catch {
      // Ignore logging failures
    }
  }
});

const port = config.port;

// Preload tech DB at startup (report-aligned), but do not crash the server if it fails.
// The analyzer will lazy-load on first request if needed.
initTechDb().catch((err) => {
  const msg = err && (err.message || String(err));
  console.warn("Tech DB preload failed; will lazy-load on first request:", msg);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`API listening on port ${port}`);
});

// Graceful shutdown for containers / orchestration (SIGTERM)
function shutdown(signal) {
  console.log(`Received ${signal}, shutting down...`);
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });

  // Force-exit if something is hung.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
