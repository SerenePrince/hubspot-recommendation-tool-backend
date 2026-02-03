// backend/src/core/detect/matchers/scripts.js
const { compilePattern } = require("../compilePattern");

function matchScripts(db, signals) {
  const scripts = typeof signals?.scripts === "string" ? signals.scripts : "";
  if (!scripts) return [];

  const out = [];

  const techNames = Array.isArray(db?.index?.scripts) ? db.index.scripts : Object.keys(db.technologies || {});
  for (const slug of techNames) {
    const tech = db.technologies?.[slug];
    if (!tech) continue;
    const patterns = tech.scripts;
    if (!patterns) continue;

    const rules = normalizePatternList(patterns);
    for (const rule of rules) {
      const compiled = compilePattern(rule);
      if (!compiled) continue;

      const m = compiled.re.exec(scripts);
      if (!m) continue;

      const version = resolveVersion(compiled.version, m);
      out.push({
        slug,
        confidence: compiled.confidence,
        version,
        evidence: "scripts",
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

module.exports = { matchScripts };
