// backend/src/core/detect/resolve/excludes.js

function applyExcludes(db, detections) {
  const byName = new Map(detections.map((d) => [d.name, d]));

  for (const d of detections) {
    const techDef = db.technologiesByName[d.name];
    if (!techDef) continue;

    const excludes = normalize(techDef.excludes);
    for (const excludedNameRaw of excludes) {
      const excludedName = parseName(excludedNameRaw);
      if (!excludedName) continue;

      const excluded = byName.get(excludedName);
      if (!excluded) continue;

      // Decide which one to keep
      const keep = pickWinner(d, excluded);
      const drop = keep === d ? excluded : d;

      // Only drop if drop is actually the excluded target
      // (We only want to remove the excluded tech, not the current one.)
      if (drop.name === excludedName) {
        byName.delete(excludedName);
      }
    }
  }

  return Array.from(byName.values());
}

function normalize(x) {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  if (typeof x === "string") return [x];
  return [];
}

function parseName(raw) {
  if (typeof raw !== "string") return null;
  return raw.split(";")[0].trim();
}

function pickWinner(a, b) {
  const ca = a.confidence || 0;
  const cb = b.confidence || 0;

  if (ca !== cb) return ca > cb ? a : b;

  // Prefer direct evidence over implied-only
  const aDirect = hasDirectEvidence(a);
  const bDirect = hasDirectEvidence(b);
  if (aDirect !== bDirect) return aDirect ? a : b;

  // Otherwise keep 'a' by default
  return a;
}

function hasDirectEvidence(det) {
  const ev = det.evidence || [];
  // If all evidence is 'implies', it's not direct
  return ev.some((e) => e.type !== "implies");
}

module.exports = { applyExcludes };
