// backend/src/core/detect/matchers/html.js
const { compilePattern } = require("../compilePattern");

/**
 * Match technologies based on raw HTML.
 * techDef.html patterns run against signals.html (capped in buildSignals).
 */
function matchHtml(techName, techDef, signals) {
  const rule = techDef.html;
  if (!rule) return [];

  const html = signals.html || "";
  if (!html) return [];

  const patterns = normalizePatterns(rule);
  if (!patterns.length) return [];

  for (const p of patterns) {
    let compiled;
    try {
      compiled = compilePattern(p);
    } catch {
      continue;
    }

    const m = compiled.regex.exec(html);
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
            type: "html",
            pattern: compiled.regex.toString(),
            match: m[0],
            valuePreview: preview(html, m.index, m[0].length),
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

function preview(text, index, len) {
  const start = Math.max(0, index - 60);
  const end = Math.min(text.length, index + len + 60);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

module.exports = { matchHtml };
