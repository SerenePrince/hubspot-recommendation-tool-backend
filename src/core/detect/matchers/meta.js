// backend/src/core/detect/matchers/meta.js
const { compilePattern } = require("../compilePattern");

/**
 * Match technologies based on meta tags.
 *
 * techDef.meta format is commonly:
 *  - { "generator": "WordPress\\s?([0-9.]+);version:\\1" }
 *  - { "csrf-token": ".*" }
 *  - patterns may be string or array
 */
function matchMeta(techName, techDef, signals) {
  const metaRules = techDef.meta;
  if (!metaRules || typeof metaRules !== "object") return [];

  const meta = signals.meta || {};
  const detections = [];

  for (const [metaKeyRaw, patternsRaw] of Object.entries(metaRules)) {
    const metaKey = metaKeyRaw.toLowerCase();
    const metaValue = meta[metaKey];
    if (!metaValue) continue;

    const patterns = normalizePatterns(patternsRaw);

    for (const p of patterns) {
      let compiled;
      try {
        compiled = compilePattern(p);
      } catch {
        continue;
      }

      const m = compiled.regex.exec(metaValue);
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
            type: "meta",
            key: metaKey,
            pattern: compiled.regex.toString(),
            match: m[0],
            value: metaValue,
          },
        ],
      });

      break; // stop after first meta match for this meta key
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
  return (
    template
      .replace(/\\(\d+)/g, (_, d) => matchArray[Number(d)] || "")
      .trim() || null
  );
}

module.exports = { matchMeta };
