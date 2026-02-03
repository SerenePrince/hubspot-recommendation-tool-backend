// backend/src/core/detect/matchers/headers.js
const { compilePattern } = require("../compilePattern");

function matchHeaders(db, signals) {
  const headers = signals?.headers && typeof signals.headers === "object" ? signals.headers : {};
  const out = [];

  const techNames = Array.isArray(db?.index?.headers) ? db.index.headers : Object.keys(db.technologies || {});
  for (const slug of techNames) {
    const tech = db.technologies?.[slug];
    if (!tech) continue;
    const headerRules = tech.headers;
    if (!headerRules || typeof headerRules !== "object") continue;

    for (const [headerNameRaw, patternRaw] of Object.entries(headerRules)) {
      const headerName = String(headerNameRaw || "").toLowerCase().trim();
      if (!headerName) continue;

      const headerVal = headers[headerName];
      if (headerVal == null) continue;

      // headerVal could be array (e.g., set-cookie)
      const values = Array.isArray(headerVal) ? headerVal : [String(headerVal)];

      const compiled = compilePattern(patternRaw);
      if (!compiled) continue;

      for (const v of values) {
        const s = String(v || "");
        const m = compiled.re.exec(s);
        if (!m) continue;

        const version = resolveVersion(compiled.version, m);
        out.push({
          slug,
          confidence: compiled.confidence,
          version,
          evidence: `header:${headerName}`,
        });
        break; // don't duplicate for the same header
      }
    }
  }

  return out;
}

function resolveVersion(template, match) {
  if (!template) return undefined;
  try {
    // Replace \1, \2, etc.
    return template.replace(/\\(\d+)/g, (_, g) => match[Number(g)] || "");
  } catch {
    return undefined;
  }
}

module.exports = { matchHeaders };
