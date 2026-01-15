// backend/src/core/detect/compilePattern.js

/**
 * Webappanalyzer/Wappalyzer-style pattern syntax often looks like:
 *   "foo\\.(js|css);confidence:50;version:\\1"
 *
 * We parse directives separated by semicolons:
 * - confidence:<number>
 * - version:<template>
 *
 * Returns:
 *   {
 *     regex: RegExp,
 *     confidence: number,
 *     versionTemplate: string | null
 *   }
 */
function compilePattern(patternString) {
  if (patternString instanceof RegExp) {
    return { regex: patternString, confidence: 100, versionTemplate: null };
  }

  if (typeof patternString !== "string" || !patternString.trim()) {
    throw new Error("Pattern must be a non-empty string");
  }

  const parts = patternString.split(";");
  const rawRegex = parts[0];

  let confidence = 100;
  let versionTemplate = null;

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    const idx = part.indexOf(":");
    if (idx === -1) continue;

    const key = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim();

    if (key === "confidence") {
      const n = Number(value);
      if (!Number.isNaN(n)) confidence = clamp(n, 0, 100);
    } else if (key === "version") {
      versionTemplate = value || null;
    }
  }

  // Wappalyzer-style patterns are typically case-insensitive
  // We default to 'i'. If you later discover explicit flags in the dataset,
  // we can extend this.
  const regex = new RegExp(rawRegex, "i");

  return { regex, confidence, versionTemplate };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

module.exports = { compilePattern };
