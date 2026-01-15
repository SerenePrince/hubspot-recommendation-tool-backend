// backend/src/core/detect/matchers/dom.js
const { compilePattern } = require("../compilePattern");

/**
 * DOM matching (MVP subset):
 * techDef.dom is often an object:
 * {
 *   "selector": {
 *     "text": "regex;confidence:..;version:..",
 *     "attributes": { "attrName": "regex" }
 *   }
 * }
 *
 * We treat presence of selector as a match if no constraints exist.
 */
function matchDom(techName, techDef, signals) {
  const rule = techDef.dom;
  if (!rule || typeof rule !== "object") return [];
  const document = signals.dom;
  if (!document) return [];

  const detections = [];

  for (const [selector, conditions] of Object.entries(rule)) {
    let nodes;
    try {
      nodes = document.querySelectorAll(selector);
    } catch {
      continue; // invalid selector
    }

    if (!nodes || nodes.length === 0) continue;

    // If rule is just an empty object, selector presence is enough
    if (!conditions || typeof conditions !== "object") {
      detections.push({
        name: techName,
        confidence: 100,
        version: null,
        evidence: [{ type: "dom", selector, detail: "selector-present" }],
      });
      continue;
    }

    const textRule = conditions.text;
    const attrRules = conditions.attributes;

    // If no text/attr rules, selector presence is enough
    if (!textRule && !attrRules) {
      detections.push({
        name: techName,
        confidence: 100,
        version: null,
        evidence: [{ type: "dom", selector, detail: "selector-present" }],
      });
      continue;
    }

    // Check each node until a match is found
    for (const node of nodes) {
      // 1) text check
      if (textRule) {
        const patterns = normalizePatterns(textRule);
        const nodeText = (node.textContent || "").trim();

        for (const p of patterns) {
          let compiled;
          try {
            compiled = compilePattern(p);
          } catch {
            continue;
          }

          const m = compiled.regex.exec(nodeText);
          if (!m) continue;

          const version = compiled.versionTemplate
            ? expandVersion(compiled.versionTemplate, m)
            : null;

          detections.push({
            name: techName,
            confidence: compiled.confidence,
            version,
            evidence: [
              {
                type: "dom",
                selector,
                detail: "text",
                pattern: compiled.regex.toString(),
                match: m[0],
                valuePreview: preview(nodeText),
              },
            ],
          });

          // one match is enough for this selector
          return detections;
        }
      }

      // 2) attribute checks
      if (attrRules && typeof attrRules === "object") {
        for (const [attrName, attrPatternRaw] of Object.entries(attrRules)) {
          const attrVal = node.getAttribute(attrName);
          if (!attrVal) continue;

          const patterns = normalizePatterns(attrPatternRaw);

          for (const p of patterns) {
            let compiled;
            try {
              compiled = compilePattern(p);
            } catch {
              continue;
            }

            const m = compiled.regex.exec(attrVal);
            if (!m) continue;

            const version = compiled.versionTemplate
              ? expandVersion(compiled.versionTemplate, m)
              : null;

            detections.push({
              name: techName,
              confidence: compiled.confidence,
              version,
              evidence: [
                {
                  type: "dom",
                  selector,
                  detail: `attr:${attrName}`,
                  pattern: compiled.regex.toString(),
                  match: m[0],
                  value: attrVal,
                },
              ],
            });

            return detections;
          }
        }
      }
    }
  }

  return detections;
}

function normalizePatterns(rule) {
  if (Array.isArray(rule)) return rule;
  if (typeof rule === "string") return [rule];
  return [];
}

function expandVersion(template, matchArray) {
  return (
    template
      .replace(/\\(\d+)/g, (_, d) => matchArray[Number(d)] || "")
      .trim() || null
  );
}

function preview(text) {
  const t = (text || "").replace(/\s+/g, " ").trim();
  return t.length > 160 ? t.slice(0, 160) + "…" : t;
}

module.exports = { matchDom };
