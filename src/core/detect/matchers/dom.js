// backend/src/core/detect/matchers/dom.js
const { compilePattern } = require("../compilePattern");

/**
 * DOM matcher:
 * Vendor "dom" rules can be:
 * - { "selector": { "exists": true } }
 * - { "selector": { "text": "regex;confidence:80" } }
 * - { "selector": { "attributes": { "attr": "regex" } } }
 *
 * We support a conservative subset commonly used by Wappalyzer data.
 */
function matchDom(db, signals) {
  const $ = signals?.dom;
  if (typeof $ !== "function") return [];

  const out = [];

  const techNames = Array.isArray(db?.index?.dom) ? db.index.dom : Object.keys(db.technologies || {});
  for (const slug of techNames) {
    const tech = db.technologies?.[slug];
    if (!tech) continue;
    const domRules = tech.dom;
    if (!domRules || typeof domRules !== "object") continue;

    try {
      for (const [selector, ruleObj] of Object.entries(domRules)) {
        if (!selector) continue;
        const rule = ruleObj && typeof ruleObj === "object" ? ruleObj : {};

        const nodes = $(selector);
        if (!nodes || nodes.length === 0) continue;

        // exists
        if (rule.exists === true) {
          out.push({ slug, confidence: 100, evidence: `dom:${selector}` });
          continue;
        }

        // text: regex
        if (rule.text) {
          const compiled = compilePattern(rule.text);
          if (compiled) {
            const combinedText = nodes
              .map((_, el) => $(el).text())
              .get()
              .join(" ");
            const m = compiled.re.exec(combinedText);
            if (m) {
              out.push({
                slug,
                confidence: compiled.confidence,
                version: resolveVersion(compiled.version, m),
                evidence: `dom:text:${selector}`,
              });
              continue;
            }
          }
        }

        // attributes: { attrName: "regex;confidence:80" }
        if (rule.attributes && typeof rule.attributes === "object") {
          for (const [attrName, patternRaw] of Object.entries(rule.attributes)) {
            const compiled = compilePattern(patternRaw);
            if (!compiled) continue;

            const vals = nodes
              .map((_, el) => $(el).attr(attrName))
              .get()
              .filter(Boolean)
              .map(String);

            for (const v of vals) {
              const m = compiled.re.exec(v);
              if (!m) continue;

              out.push({
                slug,
                confidence: compiled.confidence,
                version: resolveVersion(compiled.version, m),
                evidence: `dom:attr:${selector}[${attrName}]`,
              });
              break;
            }
          }
        }
      }
    } catch {
      // Ignore DOM matcher errors per tech to avoid taking down detection
      continue;
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

module.exports = { matchDom };
