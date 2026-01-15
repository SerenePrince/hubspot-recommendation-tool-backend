// backend/src/core/detect/resolve/implies.js

/**
 * Apply "implies" relationships.
 *
 * techDef.implies can be:
 * - string: "React"
 * - array: ["React", "Node.js"]
 * - can include confidence directives in some datasets: "React;confidence:50"
 *
 * We'll support "name;confidence:X" here too.
 */
function applyImplies(db, detections) {
  const byName = new Map(detections.map((d) => [d.name, d]));
  const additions = [];

  for (const d of detections) {
    const techDef = db.technologiesByName[d.name];
    if (!techDef) continue;

    const implies = normalize(techDef.implies);
    for (const impliedRaw of implies) {
      const { name: impliedName, confidence: impliedConfidence } =
        parseImplied(impliedRaw);
      if (!impliedName) continue;
      if (!db.technologiesByName[impliedName]) continue;

      if (byName.has(impliedName)) continue;

      additions.push({
        name: impliedName,
        confidence: Math.min(d.confidence || 100, impliedConfidence),
        version: null,
        evidence: [
          {
            type: "implies",
            from: d.name,
            detail: impliedRaw,
          },
        ],
      });

      // mark as present so we don't add it again this pass
      byName.set(impliedName, true);
    }
  }

  return detections.concat(additions);
}

function normalize(x) {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  if (typeof x === "string") return [x];
  return [];
}

function parseImplied(raw) {
  if (typeof raw !== "string") return { name: null, confidence: 80 };

  // Format: "Tech Name;confidence:50"
  const parts = raw.split(";");
  const name = parts[0].trim();

  let conf = 80; // default for implied
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].trim();
    const idx = part.indexOf(":");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim().toLowerCase();
    const val = part.slice(idx + 1).trim();
    if (key === "confidence") {
      const n = Number(val);
      if (!Number.isNaN(n)) conf = clamp(n, 0, 100);
    }
  }

  return { name, confidence: conf };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

module.exports = { applyImplies };
