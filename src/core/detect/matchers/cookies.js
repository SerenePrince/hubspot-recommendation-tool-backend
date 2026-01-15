// backend/src/core/detect/matchers/cookies.js
const { compilePattern } = require("../compilePattern");

/**
 * Cookie matching:
 * Common format is an object keyed by cookie name:
 *  techDef.cookies = { "cookieName": "pattern;confidence:50" }
 *
 * We'll match by:
 * - If rule is an object: check if cookie name exists, optionally test pattern on the cookie name
 *   (MVP uses cookie name presence; later we can test cookie value if we capture it)
 * - If rule is array/string: treat as pattern(s) against cookie names.
 */
function matchCookies(techName, techDef, signals) {
  const rule = techDef.cookies;
  if (!rule) return [];

  const cookieNames = Array.isArray(signals.cookies) ? signals.cookies : [];
  if (cookieNames.length === 0) return [];

  // Object form: { "cookieName": "pattern" }
  if (typeof rule === "object" && !Array.isArray(rule)) {
    return matchCookieObject(techName, rule, cookieNames);
  }

  // Fallback: patterns applied to cookie names
  const patterns = normalizePatterns(rule);
  if (patterns.length === 0) return [];

  const detections = [];

  for (const name of cookieNames) {
    for (const p of patterns) {
      let compiled;
      try {
        compiled = compilePattern(p);
      } catch {
        continue;
      }

      const m = compiled.regex.exec(name);
      if (!m) continue;

      const version = compiled.versionTemplate
        ? expandVersion(compiled.versionTemplate, m)
        : null;

      detections.push({
        name: techName,
        confidence: compiled.confidence,
        version,
        evidence: [
          {
            type: "cookie",
            pattern: compiled.regex.toString(),
            match: m[0],
            value: name,
          },
        ],
      });

      break;
    }
  }

  return detections;
}

function matchCookieObject(techName, cookieRuleObj, cookieNames) {
  const detections = [];

  // Make lookup set for quick presence checks
  const present = new Set(cookieNames.map((c) => c.toLowerCase()));

  for (const [cookieNameRaw, patternsRaw] of Object.entries(cookieRuleObj)) {
    const cookieName = cookieNameRaw.toLowerCase();
    if (!present.has(cookieName)) continue;

    const patterns = normalizePatterns(patternsRaw);

    // Often patterns are ".*" meaning presence is enough
    if (patterns.length === 0) {
      detections.push({
        name: techName,
        confidence: 100,
        version: null,
        evidence: [
          {
            type: "cookie",
            key: cookieName,
            pattern: null,
            match: cookieName,
            value: cookieName,
          },
        ],
      });
      continue;
    }

    // Run patterns against the cookie name (MVP: we don't have cookie values)
    for (const p of patterns) {
      let compiled;
      try {
        compiled = compilePattern(p);
      } catch {
        continue;
      }

      const m = compiled.regex.exec(cookieNameRaw);
      if (!m) continue;

      const version = compiled.versionTemplate
        ? expandVersion(compiled.versionTemplate, m)
        : null;

      detections.push({
        name: techName,
        confidence: compiled.confidence,
        version,
        evidence: [
          {
            type: "cookie",
            key: cookieNameRaw,
            pattern: compiled.regex.toString(),
            match: m[0],
            value: cookieNameRaw,
          },
        ],
      });

      break;
    }
  }

  return detections;
}

function normalizePatterns(rule) {
  if (Array.isArray(rule)) return rule;
  if (typeof rule === "string") return [rule];
  return [];
}

function expandVersion(template, matchArray) {
  return (
    template
      .replace(/\\(\d+)/g, (_, d) => matchArray[Number(d)] || "")
      .trim() || null
  );
}

module.exports = { matchCookies };
