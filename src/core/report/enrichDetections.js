// backend/src/core/report/enrichDetections.js
//
// Enhances detections with taxonomy and human-friendly metadata from the tech DB.
// Kept intentionally lightweight: description + website + icon are enough for UI.

function enrichDetections(db, detections) {
  const techBySlug = db?.technologies || {};
  const techByName = db?.technologiesByName || techBySlug;
  const categoriesById = db?.categoriesById || {};
  const groupsById = db?.groupsById || {};

  return (detections || []).map((d) => {
    // Prefer slug lookup, fallback to name lookup for backwards compatibility.
    const techDef = (d?.slug && techBySlug[d.slug]) || (d?.name && techByName[d.name]) || {};

    const catIds = Array.isArray(techDef.cats) ? techDef.cats : [];

    const categories = catIds
      .map((id) => {
        const key = String(id);
        const cat = categoriesById[key];
        if (!cat) return null;

        const groups = (cat.groups || [])
          .map((gid) => {
            const gKey = String(gid);
            const g = groupsById[gKey];
            if (!g) return null;
            return { id: gKey, name: g.name ?? null };
          })
          .filter(Boolean);

        return { id: key, name: cat.name ?? null, groups };
      })
      .filter(Boolean);

    // Flatten unique groups (by group id)
    const groupMap = new Map();
    for (const cat of categories) {
      for (const g of cat.groups || []) {
        if (g?.id) groupMap.set(g.id, g);
      }
    }
    const groups = Array.from(groupMap.values());

    return {
      // Preserve original fields
      ...d,

      // Enrichment
      description: techDef.description ?? null,
      website: techDef.website ?? null,
      icon: techDef.icon ?? null,

      categories,
      groups,
    };
  });
}

module.exports = { enrichDetections };
