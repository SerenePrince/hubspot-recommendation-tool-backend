// backend/src/core/detect/matchers/headers.js
const { compilePattern } = require("../compilePattern");

/**
 * Match technologies based on response headers.
 *
 * techDef.headers format is commonly:
 *  - { "server": "nginx(?:/([0-9.]+))?;version:\\1" }
 *  - { "set-cookie": "foo" }
 *  - OR arrays of patterns
 */
function matchHeaders(techName, techDef, signals) {
  const techHeaders = techDef.headers;
  if (!techHeaders || typeof techHeaders !== "object") return [];

  const detections = [];

  for (const [headerKeyRaw, patternsRaw] of Object.entries(techHeaders)) {
    const headerKey = headerKeyRaw.toLowerCase();

    // Our signals headers are a simple map
    const headerValue = signals.headers?.[headerKey];
    if (!headerValue) continue;

    const patterns = normalizePatterns(patternsRaw);

    for (const p of patterns) {
      let compiled;
      try {
        compiled = compilePattern(p);
      } catch {
        continue; // skip invalid patterns
      }

      const m = compiled.regex.exec(headerValue);
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
            type: "header",
            key: headerKey,
            pattern: compiled.regex.toString(),
            match: m[0],
            value: headerValue,
          },
        ],
      });

      // Stop after first match per header key for this tech to reduce duplicates
      break;
    }
  }

  return detections;
}

function normalizePatterns(patternsRaw) {
  if (Array.isArray(patternsRaw)) return patternsRaw;
  if (typeof patternsRaw === "string") return [patternsRaw];
  return [];
}

function expandVersion(template, matchArray) {
  // Replace \1, \2 etc with capture groups
  // Keep it simple and safe
  return (
    template
      .replace(/\\(\d+)/g, (_, d) => {
        const idx = Number(d);
        return matchArray[idx] || "";
      })
      .trim() || null
  );
}

module.exports = { matchHeaders };
