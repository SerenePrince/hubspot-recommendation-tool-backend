// backend/src/core/config.js
const path = require("path");

function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v, fallback) {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function bool(v, fallback = false) {
  if (v == null) return fallback;
  const s = String(v).toLowerCase().trim();
  if (s === "1" || s === "true" || s === "yes" || s === "on") return true;
  if (s === "0" || s === "false" || s === "no" || s === "off") return false;
  return fallback;
}

const config = {
  port: num(process.env.PORT, 3001),

  dataRoot: path.resolve(
    process.cwd(),
    str(process.env.DATA_ROOT, "./data/vendor/webappanalyzer/src"),
  ),

  fetch: {
    timeoutMs: num(process.env.FETCH_TIMEOUT_MS, 12_000),
    maxBytes: num(process.env.MAX_FETCH_BYTES, 2_000_000),
  },

  env: str(process.env.NODE_ENV, "development"),

  logging: {
    // Enable request log lines (JSON) in prod when needed.
    requestLog: bool(process.env.REQUEST_LOG, false),
  },

  cors: {
    // "*" for simple dev; set to a specific origin for production hardening if desired.
    allowOrigin: str(process.env.CORS_ALLOW_ORIGIN, "*"),
  },

  api: {
    // Concurrency guardrail to prevent resource exhaustion from many long-running fetches.
    // If the limit is reached, /analyze returns 503 with a retryable message.
    maxConcurrentAnalyses: num(process.env.MAX_CONCURRENT_ANALYSES, 8),
    // Reject requests when the wait queue exceeds this size (keeps memory bounded).
    maxQueuedAnalyses: num(process.env.MAX_QUEUED_ANALYSES, 32),
  },

  // Internal-only debug
  debugSignals: bool(process.env.DEBUG_SIGNALS, false),
};

module.exports = { config };
