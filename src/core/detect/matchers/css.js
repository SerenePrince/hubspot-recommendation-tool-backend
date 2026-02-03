// backend/src/core/detect/matchers/css.js
const { compilePattern } = require("../compilePattern");

function matchCss(db, signals) {
  const cssObj = signals?.css && typeof signals.css === "object" ? signals.css : {};
  const cssText = typeof cssObj.inline === "string" ? cssObj.inline : "";
  const hrefs = Array.isArray(cssObj.hrefs) ? cssObj.hrefs : [];

  if (!cssText && hrefs.length === 0) return [];

  const out = [];

  const techNames = Array.isArray(db?.index?.css) ? db.index.css : Object.keys(db.technologies || {});
  for (const slug of techNames) {
    const tech = db.technologies?.[slug];
    if (!tech) continue;
    const patterns = tech.css;
    if (!patterns) continue;

    const rules = normalizePatternList(patterns);
    for (const rule of rules) {
      const compiled = compilePattern(rule);
      if (!compiled) continue;

      // Check CSS text first
      if (cssText) {
        const m = compiled.re.exec(cssText);
        if (m) {
          const version = resolveVersion(compiled.version, m);
          out.push({
            slug,
            confidence: compiled.confidence,
            version,
            evidence: "css:inline",
          });
          continue;
        }
      }

      // Check CSS hrefs
      for (const href of hrefs) {
        const m = compiled.re.exec(String(href));
        if (!m) continue;

        const version = resolveVersion(compiled.version, m);
        out.push({
          slug,
          confidence: compiled.confidence,
          version,
          evidence: "css:href",
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

module.exports = { matchCss };
