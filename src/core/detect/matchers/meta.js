// backend/src/core/detect/matchers/meta.js
const { compilePattern } = require("../compilePattern");

function matchMeta(db, signals) {
  const meta = signals?.meta && typeof signals.meta === "object" ? signals.meta : {};
  const out = [];

  const techNames = Array.isArray(db?.index?.meta) ? db.index.meta : Object.keys(db.technologies || {});
  for (const slug of techNames) {
    const tech = db.technologies?.[slug];
    if (!tech) continue;
    const metaRules = tech.meta;
    if (!metaRules || typeof metaRules !== "object") continue;

    for (const [metaKeyRaw, patternRaw] of Object.entries(metaRules)) {
      const metaKey = String(metaKeyRaw || "").toLowerCase().trim();
      if (!metaKey) continue;

      const val = meta[metaKey];
      if (!val) continue;

      const compiled = compilePattern(patternRaw);
      if (!compiled) continue;

      const m = compiled.re.exec(String(val));
      if (!m) continue;

      const version = resolveVersion(compiled.version, m);
      out.push({
        slug,
        confidence: compiled.confidence,
        version,
        evidence: `meta:${metaKey}`,
      });
    }
  }

  return out;
}

function resolveVersion(template, match) {
  if (!template) return undefined;
  try {
    return template.replace(/\\(\d+)/g, (_, g) => match[Number(g)] || "");
  } catch {
    return undefined;
  }
}

module.exports = { matchMeta };
