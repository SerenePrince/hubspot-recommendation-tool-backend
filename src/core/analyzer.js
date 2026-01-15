// backend/src/core/analyzer.js
const { fetchPage } = require("./fetch/fetchPage");
const { buildSignals } = require("./normalize/signals");
const { loadTechDb } = require("./techdb/loadTechDb");
const { detectTechnologies } = require("./detect/detectTechnologies");
const { enrichDetections } = require("./report/enrichDetections");
const { buildRecommendations } = require("./report/recommendations");
const { SimpleCache } = require("./cache/simpleCache");
const { buildCacheKey } = require("./cache/cacheKey");
const { buildSummary } = require("./report/summarize");
const { groupDetectionsByGroup } = require("./report/groupDetections");
const { buildNextActions } = require("./report/nextActions");
const { config } = require("./config");

let cachedDb = null;
const reportCache = new SimpleCache({
  maxEntries: config.cache.maxEntries,
  ttlMs: config.cache.ttlMs,
});

async function analyzeUrl(url) {
  const totalStart = Date.now();

  if (!cachedDb) cachedDb = await loadTechDb();

  // Cache by requested URL (safe and simple)
  const cacheKey = buildCacheKey(url);
  const cached = reportCache.get(cacheKey);
  if (cached) {
    return {
      ...cached,
      cache: { hit: true, ttlMs: reportCache.ttlMs, key: cacheKey },
    };
  }

  const fetched = await fetchPage(url);
  const fetchMs = fetched.timingMs;

  const analysisStart = Date.now();
  const signals = buildSignals(fetched);

  const debugSignals = {
    meta: signals.meta,
    scriptSrc: signals.scriptSrc,
    cookies: signals.cookies,
    cssHrefs: signals.cssHrefs,
  };

  const detections = detectTechnologies(cachedDb, signals);
  const enriched = enrichDetections(cachedDb, detections);

  enriched.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return a.name.localeCompare(b.name);
  });

  const summary = buildSummary(enriched);
  const groupedDetections = groupDetectionsByGroup(enriched);

  const recommendations = buildRecommendations(enriched, { minConfidence: 70 });
  const nextActions = buildNextActions(recommendations, { max: 5 });

  const analysisMs = Date.now() - analysisStart;
  const totalMs = Date.now() - totalStart;

  const report = {
    ok: true,
    url,
    finalUrl: fetched.finalUrl,
    fetch: {
      status: fetched.status,
      contentType: fetched.contentType,
      bytes: fetched.bytes,
      timingMs: fetchMs,
      headers: pickHeaders(fetched.headers, [
        "server",
        "x-powered-by",
        "via",
        "cf-ray",
        "cf-cache-status",
        "x-vercel-cache",
        "x-vercel-id",
        "x-served-by",
        "x-cache",
        "set-cookie",
      ]),
    },
    timings: {
      analysisMs,
      totalMs,
    },
    detections: enriched,
    recommendations,
    nextActions,
    cache: { hit: false, key: cacheKey },
    summary,
    groups: groupedDetections,
    _debugSignals: debugSignals,
  };

  reportCache.set(cacheKey, report);
  return report;
}

function pickHeaders(headers, keys) {
  const out = {};
  for (const k of keys) {
    if (headers && headers[k] != null) out[k] = headers[k];
  }
  return out;
}

module.exports = { analyzeUrl };
