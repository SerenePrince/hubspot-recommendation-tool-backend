// backend/src/core/detect/matchers/scriptSrc.js
const { compilePattern } = require("../compilePattern");

function matchScriptSrc(techName, techDef, signals) {
  const rule = techDef.scriptSrc;
  if (!rule) return [];

  const srcs = Array.isArray(signals.scriptSrc) ? signals.scriptSrc : [];
  if (srcs.length === 0) return [];

  const patterns = normalizePatterns(rule);
  if (patterns.length === 0) return [];

  const detections = [];

  for (const src of srcs) {
    for (const p of patterns) {
      let compiled;
      try {
        compiled = compilePattern(p);
      } catch {
        continue;
      }

      const m = compiled.regex.exec(src);
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
            type: "scriptSrc",
            pattern: compiled.regex.toString(),
            match: m[0],
            value: src,
          },
        ],
      });

      // Avoid spamming duplicates for the same tech from many scripts
      // (we already merge later)
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

module.exports = { matchScriptSrc };
