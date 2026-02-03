const { analyzeUrl } = require("../../core/analyzer");
const { buildSimpleReport } = require("../../core/report/cleanReport");
const { isAppError } = require("../../core/errors");
const { analysisLimiter } = require("../analysisLimiter");
const { config } = require("../../core/config");

function isTruthy(v) {
  const s = typeof v === "string" ? v.toLowerCase() : "";
  return s === "1" || s === "true";
}

function sendJson(res, status, payload, pretty) {
  const body = pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(body);
}

function normalizeAndValidateUrl(raw) {
  if (typeof raw !== "string") return { ok: false, error: "Missing or invalid 'url' in query string" };

  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: "Missing or invalid 'url' in query string" };

  // Hard cap to avoid abuse
  if (trimmed.length > 2048) return { ok: false, error: "URL is too long" };

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: "Invalid URL format" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Only http:// and https:// URLs are supported" };
  }

  return { ok: true, url: parsed.toString() };
}

/**
 * GET /analyze
 *
 * Lightweight response intended for frontend display.
 *
 * Query params:
 * - url (required)
 * - pretty=1
 * - includeMeta=1
 */
async function handleAnalyze(_req, res, requestUrl) {
  const pretty = isTruthy(requestUrl.searchParams.get("pretty"));
  const includeMeta = isTruthy(requestUrl.searchParams.get("includeMeta"));
  const rawUrl = requestUrl.searchParams.get("url");

  const normalized = normalizeAndValidateUrl(rawUrl);
  if (!normalized.ok) {
    return sendJson(
      res,
      400,
      {
        ok: false,
        error: normalized.error,
        example: "/analyze?url=https://react.dev/",
      },
      pretty,
    );
  }

  try {
    const release = await analysisLimiter.acquire();
    try {
      const report = await analyzeUrl(normalized.url);
      const response = buildSimpleReport(report, { includeMeta });
      return sendJson(res, 200, response, pretty);
    } finally {
      release();
    }
  } catch (err) {
    // Map operational errors to their intended status code.
    if (isAppError(err)) {
      return sendJson(
        res,
        err.statusCode,
        { ok: false, error: err.expose ? err.message : "Request failed" },
        pretty,
      );
    }

    const safeMessage =
      config.env === "production"
        ? "Internal server error"
        : (err && (err.message || String(err))) || "Unknown error";

    return sendJson(res, 500, { ok: false, error: safeMessage }, pretty);
  }
}

module.exports = { handleAnalyze };
