// backend/src/core/detect/matchers/html.js
const { compilePattern } = require("../compilePattern");

function matchHtml(db, signals) {
  const html = typeof signals?.html === "string" ? signals.html : "";
  if (!html) return [];

  const out = [];

  const techNames = Array.isArray(db?.index?.html) ? db.index.html : Object.keys(db.technologies || {});
  for (const slug of techNames) {
    const tech = db.technologies?.[slug];
    if (!tech) continue;
    const patterns = tech.html;
    if (!patterns) continue;

    const rules = normalizePatternList(patterns);
    for (const rule of rules) {
      const compiled = compilePattern(rule);
      if (!compiled) continue;

      const m = compiled.re.exec(html);
      if (!m) continue;

      const version = resolveVersion(compiled.version, m);
      out.push({
        slug,
        confidence: compiled.confidence,
        version,
        evidence: "html",
      });
    }
  }

  return out;
}

function normalizePatternList(v) {
  // Vendor can provide string or array
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

module.exports = { matchHtml };
