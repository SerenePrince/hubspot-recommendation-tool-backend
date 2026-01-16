// backend/src/core/config.js
const path = require("path");

function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v, fallback) {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

const config = {
  port: num(process.env.PORT, 3001),

  dataRoot: path.resolve(
    process.cwd(),
    str(process.env.DATA_ROOT, "../data/vendor/webappanalyzer/src"),
  ),

  cache: {
    ttlMs: num(process.env.REPORT_CACHE_TTL_MS, 5 * 60 * 1000),
    maxEntries: num(process.env.REPORT_CACHE_MAX_ENTRIES, 200),
  },

  fetch: {
    timeoutMs: num(process.env.FETCH_TIMEOUT_MS, 12_000),
    maxBytes: num(process.env.MAX_FETCH_BYTES, 2_000_000),
  },

  env: str(process.env.NODE_ENV, "development"),
};

module.exports = { config };
