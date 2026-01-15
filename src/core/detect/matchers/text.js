// backend/src/core/detect/matchers/text.js
const { compilePattern } = require("../compilePattern");

/**
 * Match technologies based on "text" patterns.
 * In this dataset, "text" generally means regex against page HTML/text content.
 *
 * We use signals.text (already capped) to keep this safe.
 */
function matchText(techName, techDef, signals) {
  const rule = techDef.text;
  if (!rule) return [];

  const text = signals.text || "";
  if (!text) return [];

  const patterns = normalizePatterns(rule);
  if (patterns.length === 0) return [];

  for (const p of patterns) {
    let compiled;
    try {
      compiled = compilePattern(p);
    } catch {
      continue;
    }

    const m = compiled.regex.exec(text);
    if (!m) continue;

    const version = compiled.versionTemplate
      ? expandVersion(compiled.versionTemplate, m)
      : null;

    return [
      {
        name: techName,
        confidence: compiled.confidence,
        version,
        evidence: [
          {
            type: "text",
            pattern: compiled.regex.toString(),
            match: m[0],
            // Don't dump huge HTML blobs; store a tiny preview
            valuePreview: previewMatch(text, m.index, m[0].length),
          },
        ],
      },
    ];
  }

  return [];
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

function previewMatch(text, index, len) {
  const start = Math.max(0, index - 60);
  const end = Math.min(text.length, index + len + 60);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

module.exports = { matchText };
