// backend/src/core/detect/matchers/url.js
const { compilePattern } = require("../compilePattern");

function matchUrl(db, signals) {
  const url = typeof signals?.url === "string" ? signals.url : "";
  if (!url) return [];

  const out = [];

  const techNames = Array.isArray(db?.index?.url) ? db.index.url : Object.keys(db.technologies || {});
  for (const slug of techNames) {
    const tech = db.technologies?.[slug];
    if (!tech) continue;
    const patterns = tech.url;
    if (!patterns) continue;

    const rules = normalizePatternList(patterns);
    for (const rule of rules) {
      const compiled = compilePattern(rule);
      if (!compiled) continue;

      const m = compiled.re.exec(url);
      if (!m) continue;

      const version = resolveVersion(compiled.version, m);
      out.push({
        slug,
        confidence: compiled.confidence,
        version,
        evidence: "url",
      });
    }
  }

  return out;
}

function normalizePatternList(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  return [String(v)];
}

function resolveVersion(template, match) {
  if (!template) return undefined;
  try {
    return template.replace(/\\(\d+)/g, (_, g) => match[Number(g)] || "");
  } catch {
    return undefined;
  }
}

module.exports = { matchUrl };
