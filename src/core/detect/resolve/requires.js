// backend/src/core/detect/resolve/requires.js

function applyRequires(db, detections) {
  const presentNames = new Set(detections.map((d) => d.name));

  // Build a set of present category IDs and names from detections
  const presentCategoryIds = new Set();
  const presentCategoryNames = new Set();

  for (const d of detections) {
    const techDef = db.technologiesByName[d.name];
    const catIds = Array.isArray(techDef?.cats) ? techDef.cats : [];
    for (const id of catIds) {
      const key = String(id);
      presentCategoryIds.add(key);
      const cat = db.categoriesById?.[key];
      if (cat?.name) presentCategoryNames.add(cat.name);
    }
  }

  const kept = [];

  for (const det of detections) {
    const techDef = db.technologiesByName[det.name];
    if (!techDef) {
      kept.push(det);
      continue;
    }

    const requires = normalize(techDef.requires);
    const requiresCategory = normalize(techDef.requiresCategory);

    if (
      requires.length &&
      !requires.every((r) => presentNames.has(parseName(r)))
    ) {
      continue; // missing required tech
    }

    if (
      requiresCategory.length &&
      !requiresCategory.every((rc) => hasCategory(rc))
    ) {
      continue; // missing required category
    }

    kept.push(det);
  }

  return kept;

  function hasCategory(raw) {
    if (raw == null) return true;

    // Accept either category ID ("1") or name ("CMS")
    const s = String(raw).trim();
    if (!s) return true;

    if (presentCategoryIds.has(s)) return true;
    if (presentCategoryNames.has(s)) return true;

    // Also support "CMS;something" style just in case
    const name = s.split(";")[0].trim();
    return presentCategoryIds.has(name) || presentCategoryNames.has(name);
  }
}

function normalize(x) {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  if (typeof x === "string") return [x];
  return [];
}

function parseName(raw) {
  if (typeof raw !== "string") return "";
  return raw.split(";")[0].trim();
}

module.exports = { applyRequires };
