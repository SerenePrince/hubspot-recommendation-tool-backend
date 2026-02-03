// backend/src/core/detect/detectTechnologies.js

const { matchCookies } = require("./matchers/cookies");
const { matchHeaders } = require("./matchers/headers");
const { matchHtml } = require("./matchers/html");
const { matchMeta } = require("./matchers/meta");
const { matchScriptSrc } = require("./matchers/scriptSrc");
const { matchScripts } = require("./matchers/scripts");
const { matchCss } = require("./matchers/css");
const { matchText } = require("./matchers/text");
const { matchUrl } = require("./matchers/url");
const { matchDom } = require("./matchers/dom");

const { resolveRequires } = require("./resolve/requires");
const { resolveImplies } = require("./resolve/implies");
const { resolveExcludes } = require("./resolve/excludes");

/**
 * Phase 4 (Technical Report): detect technologies by matching patterns across 10 matcher types.
 *
 * Report invariants:
 * - Each matcher yields confidence 0..100
 * - Confidence is aggregated across matchers
 * - Filter out detections below minConfidence (default 50)
 * - Apply implies/requires relationships
 */
function detectTechnologies(db, signals, options = {}) {
  const { minConfidence = 50 } = options;

  if (!db || !db.technologies) {
    throw new Error("Tech DB is not loaded");
  }

  // slug -> { slug, name, confidence, version, _versionBestConf, evidence[] }
  const detections = new Map();

  // Run matchers (order doesn't affect correctness; keep stable for determinism)
  runMatcher(detections, matchUrl, db, signals);
  runMatcher(detections, matchHeaders, db, signals);
  runMatcher(detections, matchCookies, db, signals);
  runMatcher(detections, matchMeta, db, signals);
  runMatcher(detections, matchHtml, db, signals);
  runMatcher(detections, matchText, db, signals);
  runMatcher(detections, matchScriptSrc, db, signals);
  runMatcher(detections, matchScripts, db, signals);
  runMatcher(detections, matchCss, db, signals);
  runMatcher(detections, matchDom, db, signals);

  let found = Array.from(detections.values()).map(finalizeDetection);

  // Relationship resolution (defensive / no-throw)
  found = resolveRequires(found, db);
  found = resolveImplies(found, db);
  found = resolveExcludes(found, db); // vendor-compat extension

  // Apply threshold after relationship resolution
  found = found.filter((d) => (d.confidence || 0) >= minConfidence);

  // Stable order (confidence desc, slug asc)
  found.sort((a, b) => {
    if ((b.confidence || 0) !== (a.confidence || 0)) return (b.confidence || 0) - (a.confidence || 0);
    return (a.slug || "").localeCompare(b.slug || "");
  });

  return found;
}

function runMatcher(detections, matcherFn, db, signals) {
  try {
    const matches = matcherFn(db, signals);
    if (!Array.isArray(matches)) return;

    for (const m of matches) {
      if (!m || !m.slug) continue;

      const slug = String(m.slug);
      const tech = db.technologies[slug];
      if (!tech) continue;

      const incomingConf = clampConfidence(m.confidence);
      const existing = detections.get(slug) || {
        slug,
        name: tech.name || slug,
        confidence: 0,
        version: undefined,
        _versionBestConf: -1,
        evidence: [],
      };

      // Aggregate confidence across matchers (bounded [0,100])
      existing.confidence = aggregateConfidence(existing.confidence, incomingConf);

      // Prefer version from the single strongest evidence match
      if (m.version && typeof m.version === "string") {
        if (incomingConf > (existing._versionBestConf ?? -1)) {
          existing._versionBestConf = incomingConf;
          existing.version = m.version;
        }
      }

      if (m.evidence) {
        const ev = String(m.evidence).trim();
        if (ev) existing.evidence.push(ev);
      }

      detections.set(slug, existing);
    }
  } catch {
    // A matcher should never take down the pipeline.
  }
}

/**
 * Aggregate confidence scores from multiple matchers.
 *
 * Uses probabilistic OR:
 *   combined = 1 - (1-a)*(1-b)  where a,b in [0,1]
 *
 * Benefits:
 * - stays in [0,100]
 * - multiple independent weak signals compound
 * - diminishing returns prevents runaway sums
 */
function aggregateConfidence(current, incoming) {
  const a = clampConfidence(current) / 100;
  const b = clampConfidence(incoming) / 100;
  const combined = 1 - (1 - a) * (1 - b);
  return clampConfidence(combined * 100);
}

function finalizeDetection(d) {
  const out = {
    slug: d.slug,
    name: d.name,
    confidence: clampConfidence(d.confidence),
  };
  if (d.version) out.version = d.version;

  if (Array.isArray(d.evidence) && d.evidence.length) {
    out.evidence = dedupe(d.evidence).slice(0, 20);
  }

  return out;
}

function dedupe(arr) {
  const seen = new Set();
  const out = [];
  for (const v of arr) {
    const s = String(v || "").trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function clampConfidence(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 100) return 100;
  return Math.round(x);
}

module.exports = { detectTechnologies };
