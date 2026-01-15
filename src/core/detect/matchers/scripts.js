// backend/src/core/detect/matchers/scripts.js
const { compilePattern } = require("../compilePattern");

/**
 * Match technologies based on inline script contents.
 * techDef.scripts patterns run against combined inline scripts.
 */
function matchScripts(techName, techDef, signals) {
  const rule = techDef.scripts;
  if (!rule) return [];

  const scripts = signals.inlineScripts || "";
  if (!scripts) return [];

  const patterns = normalizePatterns(rule);
  if (patterns.length === 0) return [];

  for (const p of patterns) {
    let compiled;
    try {
      compiled = compilePattern(p);
    } catch {
      continue;
    }

    const m = compiled.regex.exec(scripts);
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
            type: "scripts",
            pattern: compiled.regex.toString(),
            match: m[0],
            valuePreview: previewMatch(scripts, m.index, m[0].length),
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

module.exports = { matchScripts };
