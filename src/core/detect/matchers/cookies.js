// backend/src/core/detect/matchers/cookies.js
const { compilePattern } = require("../compilePattern");

function matchCookies(db, signals) {
  const cookies = Array.isArray(signals?.cookies) ? signals.cookies : [];
  if (cookies.length === 0) return [];

  const out = [];

  const techNames = Array.isArray(db?.index?.cookies) ? db.index.cookies : Object.keys(db.technologies || {});
  for (const slug of techNames) {
    const tech = db.technologies?.[slug];
    if (!tech) continue;
    const patterns = tech.cookies;
    if (!patterns) continue;

    const rules = normalizePatternMap(patterns); // { cookieName: patternString | 1 }
    for (const [cookieName, patternValue] of Object.entries(rules)) {
      const found = cookies.includes(cookieName);
      if (!found) continue;

      // If vendor specifies a regex for cookie value, we can't check value (we only keep names),
      // so treat presence as match but with conservative confidence unless directives exist.
      const compiled = compilePattern(String(patternValue || ".*"));
      if (!compiled) continue;

      out.push({
        slug,
        confidence: compiled.confidence ?? 100,
        version: undefined,
        evidence: `cookie:${cookieName}`,
      });
    }
  }

  return out;
}

function normalizePatternMap(v) {
  // Wappalyzer can store cookie patterns as:
  // { "cookieName": "pattern;confidence:80" } or { "cookieName": 1 }
  // We normalize to a plain object of string -> string|number
  if (!v || typeof v !== "object") return {};
  return v;
}

module.exports = { matchCookies };
