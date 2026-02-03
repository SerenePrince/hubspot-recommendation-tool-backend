// backend/src/core/detect/compilePattern.js

/**
 * Pattern compiler compatible with Wappalyzer-style patterns:
 * - "pattern" may contain directives separated by unescaped semicolons, e.g.:
 *   "react\;confidence:80\;version:\1"
 * - Supports directives:
 *   - confidence:<0..100>
 *   - version:<string with backrefs>
 *
 * Production hardening:
 * - Memoized to avoid recompiling thousands of regexes per request
 * - Bounded cache size to prevent unbounded memory growth
 */

const CACHE_MAX = 50_000;
const cache = new Map(); // rawPattern -> compiled|null

function compilePattern(pattern) {
  if (pattern == null) return null;

  const raw = String(pattern);
  if (cache.has(raw)) return cache.get(raw) || null;

  const compiled = compilePatternUncached(raw) || null;
  cache.set(raw, compiled);

  // Simple bounded cache eviction (FIFO-ish)
  if (cache.size > CACHE_MAX) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }

  return compiled;
}

function compilePatternUncached(raw) {
  const parts = splitDirectives(raw);
  const patternPart = parts.shift() ?? "";
  const directives = parseDirectives(parts);

  const re = safeRegex(patternPart);
  if (!re) return null;

  return {
    re,
    confidence: clampConfidence(directives.confidence ?? 100),
    version:
      typeof directives.version === "string" && directives.version.length ? directives.version : undefined,
  };
}

function splitDirectives(s) {
  const out = [];
  let buf = "";
  let escaped = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (escaped) {
      buf += ch;
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      buf += ch;
      escaped = true;
      continue;
    }

    if (ch === ";") {
      out.push(buf);
      buf = "";
      continue;
    }

    buf += ch;
  }

  out.push(buf);
  return out;
}

function parseDirectives(parts) {
  const out = {};
  for (const p of parts) {
    const part = String(p || "").trim();
    if (!part) continue;

    const idx = part.indexOf(":");
    if (idx === -1) continue;

    const key = part.slice(0, idx).trim().toLowerCase();
    const val = part.slice(idx + 1).trim();

    if (!key) continue;

    if (key === "confidence") {
      const n = Number(val);
      if (Number.isFinite(n)) out.confidence = n;
      continue;
    }

    if (key === "version") {
      out.version = val;
      continue;
    }

    // Ignore unknown directives to remain forward-compatible with vendor data
  }

  return out;
}

function clampConfidence(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 100;
  if (x < 0) return 0;
  if (x > 100) return 100;
  return Math.round(x);
}

function safeRegex(pattern) {
  const p = String(pattern || "");
  if (!p) return null;

  try {
    return new RegExp(p, "i");
  } catch {
    // Vendor data can occasionally contain bad regex. Fail closed for that pattern.
    return null;
  }
}

module.exports = { compilePattern };
