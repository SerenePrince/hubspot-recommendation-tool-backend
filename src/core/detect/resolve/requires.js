// backend/src/core/detect/resolve/requires.js

/**
 * Apply "requires" relationships:
 * - If a tech is detected but one of its required techs is not present,
 *   drop the tech (conservative, avoids false positives).
 *
 * Vendor DB often stores requires as:
 * - string: "jquery"
 * - array: ["jquery", "wordpress"]
 * - or combined rules in a string; we support splitting by comma.
 */

function resolveRequires(detections, db) {
  if (!Array.isArray(detections) || !db?.technologies) return detections || [];

  const present = new Set(detections.map((d) => d.slug));
  const out = [];

  for (const d of detections) {
    const tech = db.technologies[d.slug];
    if (!tech) continue;

    const requires = normalizeList(tech.requires);
    if (requires.length === 0) {
      out.push(d);
      continue;
    }

    const ok = requires.every((slug) => present.has(slug));
    if (ok) out.push(d);
  }

  return out;
}

function normalizeList(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(normSlug).filter(Boolean);

  const s = String(v).trim();
  if (!s) return [];

  // Split common delimiters
  return s
    .split(/[,\n]/g)
    .map((x) => normSlug(x))
    .filter(Boolean);
}

function normSlug(s) {
  const x = String(s || "").trim();
  return x ? x : null;
}

module.exports = { resolveRequires };
