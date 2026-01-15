// backend/src/core/report/groupDetections.js

function groupDetectionsByGroup(detections) {
  const out = {};

  for (const d of detections || []) {
    const groups = (d.groups || []).map((g) => g.name).filter(Boolean);
    const bucketNames = groups.length ? groups : ["Other"];

    for (const g of bucketNames) {
      if (!out[g]) out[g] = [];
      out[g].push(d);
    }
  }

  // Sort each group: confidence desc then name
  for (const g of Object.keys(out)) {
    out[g].sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return a.name.localeCompare(b.name);
    });
  }

  return out;
}

module.exports = { groupDetectionsByGroup };
