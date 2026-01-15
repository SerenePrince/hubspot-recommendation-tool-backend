// backend/src/core/detect/matchers/css.js
const { compilePattern } = require("../compilePattern");

/**
 * Match technologies based on CSS.
 * We match against:
 * - signals.cssHrefs (stylesheet URLs)
 * - signals.inlineCss (combined inline <style> text)
 *
 * Dataset "css" patterns generally run against stylesheet URLs or CSS content.
 */
function matchCss(techName, techDef, signals) {
  const rule = techDef.css;
  if (!rule) return [];

  const patterns = normalizePatterns(rule);
  if (!patterns.length) return [];

  // 1) stylesheet hrefs (fast)
  const hrefs = Array.isArray(signals.cssHrefs) ? signals.cssHrefs : [];
  for (const href of hrefs) {
    const hit = matchAgainst(patterns, href, "cssHref");
    if (hit) {
      hit.name = techName;
      return [hit];
    }
  }

  // 2) inline CSS (heavier)
  const inlineCss = signals.inlineCss || "";
  if (inlineCss) {
    const hit = matchAgainst(patterns, inlineCss, "cssInline", true);
    if (hit) {
      hit.name = techName;
      return [hit];
    }
  }

  return [];
}

function matchAgainst(patterns, value, type, preview = false) {
  for (const p of patterns) {
    let compiled;
    try {
      compiled = compilePattern(p);
    } catch {
      continue;
    }

    const m = compiled.regex.exec(value);
    if (!m) continue;

    const version = compiled.versionTemplate
      ? expandVersion(compiled.versionTemplate, m)
      : null;

    return {
      name: null, // filled by caller
      confidence: compiled.confidence,
      version,
      evidence: [
        {
          type,
          pattern: compiled.regex.toString(),
          match: m[0],
          ...(preview
            ? { valuePreview: previewMatch(value, m.index, m[0].length) }
            : { value }),
        },
      ],
    };
  }
  return null;
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

module.exports = { matchCss, _matchAgainst: matchAgainst };
