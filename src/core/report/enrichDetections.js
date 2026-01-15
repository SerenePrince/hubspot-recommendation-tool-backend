// backend/src/core/report/enrichDetections.js

function enrichDetections(db, detections) {
  return detections.map((d) => {
    const techDef = db.technologiesByName[d.name] || {};
    const catIds = Array.isArray(techDef.cats) ? techDef.cats : [];

    const categories = catIds
      .map((id) => {
        const key = String(id);
        const cat = db.categoriesById[key];
        if (!cat) return null;

        const groups = (cat.groups || [])
          .map((gid) => {
            const gKey = String(gid);
            const g = db.groupsById[gKey];
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
      ...d,
      categories,
      groups,
    };
  });
}

module.exports = { enrichDetections };
