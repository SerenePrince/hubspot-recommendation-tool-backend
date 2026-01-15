// backend/src/core/detect/matchers/url.js
const { compilePattern } = require("../compilePattern");

function matchUrl(techName, techDef, signals) {
  const rule = techDef.url;
  if (!rule) return [];

  const url = signals.url || "";
  if (!url) return [];

  const patterns = normalizePatterns(rule);
  if (patterns.length === 0) return [];

  const detections = [];

  for (const p of patterns) {
    let compiled;
    try {
      compiled = compilePattern(p);
    } catch {
      continue;
    }

    const m = compiled.regex.exec(url);
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
          type: "url",
          pattern: compiled.regex.toString(),
          match: m[0],
          value: url,
        },
      ],
    });

    // One URL match is enough
    break;
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

module.exports = { matchUrl };
