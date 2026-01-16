// backend/src/core/report/summarize.js

function buildSummary(detections) {
  const byGroup = new Map();
  const byCategory = new Map();

  for (const d of detections || []) {
    const groups = (d.groups || []).map((g) => g.name).filter(Boolean);
    const cats = (d.categories || []).map((c) => c.name).filter(Boolean);

    for (const g of groups.length ? groups : ["Other"]) {
      byGroup.set(g, (byGroup.get(g) || 0) + 1);
    }

    for (const c of cats) {
      byCategory.set(c, (byCategory.get(c) || 0) + 1);
    }
  }

  return {
    totals: {
      detections: (detections || []).length,
      groups: byGroup.size,
      categories: byCategory.size,
    },
    countsByGroup: mapToSortedObject(byGroup),
    countsByCategory: mapToSortedObject(byCategory),
  };
}

function mapToSortedObject(map) {
  return Object.fromEntries(
    Array.from(map.entries()).sort((a, b) => {
      // sort by count desc, then name asc
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    }),
  );
}

module.exports = { buildSummary };
