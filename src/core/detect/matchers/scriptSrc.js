// backend/src/core/detect/matchers/scriptSrc.js
const { compilePattern } = require("../compilePattern");

function matchScriptSrc(db, signals) {
  const scriptSrc = Array.isArray(signals?.scriptSrc) ? signals.scriptSrc : [];
  if (scriptSrc.length === 0) return [];

  const out = [];

  const techNames = Array.isArray(db?.index?.scriptSrc) ? db.index.scriptSrc : Object.keys(db.technologies || {});
  for (const slug of techNames) {
    const tech = db.technologies?.[slug];
    if (!tech) continue;
    const patterns = tech.scriptSrc;
    if (!patterns) continue;

    const rules = normalizePatternList(patterns);
    for (const rule of rules) {
      const compiled = compilePattern(rule);
      if (!compiled) continue;

      for (const src of scriptSrc) {
        const m = compiled.re.exec(String(src));
        if (!m) continue;

        const version = resolveVersion(compiled.version, m);
        out.push({
          slug,
          confidence: compiled.confidence,
          version,
          evidence: "scriptSrc",
        });
        break;
      }
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

module.exports = { matchScriptSrc };
