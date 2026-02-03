// backend/src/core/detect/resolve/excludes.js

/**
 * Apply "excludes" relationships:
 * - If A excludes B, and both are present, drop the lower-confidence one.
 * - If confidence ties, keep deterministic: keep lexicographically smaller slug.
 */

function resolveExcludes(detections, db) {
  if (!Array.isArray(detections) || !db?.technologies) return detections || [];

  const bySlug = new Map(detections.map((d) => [d.slug, { ...d }]));

  for (const d of detections) {
    const tech = db.technologies[d.slug];
    if (!tech) continue;

    const excludes = normalizeList(tech.excludes);
    if (excludes.length === 0) continue;

    for (const ex of excludes) {
      if (!bySlug.has(ex)) continue;

      const a = bySlug.get(d.slug);
      const b = bySlug.get(ex);
      if (!a || !b) continue;

      const keepSlug = decideKeep(a, b);
      const dropSlug = keepSlug === a.slug ? b.slug : a.slug;

      // Only drop if still present
      if (bySlug.has(dropSlug)) bySlug.delete(dropSlug);
    }
  }

  return Array.from(bySlug.values());
}

function decideKeep(a, b) {
  const ac = Number(a.confidence || 0);
  const bc = Number(b.confidence || 0);

  if (ac > bc) return a.slug;
  if (bc > ac) return b.slug;

  // tie-break deterministically
  return String(a.slug).localeCompare(String(b.slug)) <= 0 ? a.slug : b.slug;
}

function normalizeList(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(normSlug).filter(Boolean);

  const s = String(v).trim();
  if (!s) return [];

  return s
    .split(/[,\n]/g)
    .map((x) => normSlug(x))
    .filter(Boolean);
}

function normSlug(s) {
  const x = String(s || "").trim();
  return x ? x : null;
}

module.exports = { resolveExcludes };
