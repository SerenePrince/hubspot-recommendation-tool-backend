// backend/src/core/report/groupDetections.js

function groupDetections(detections) {
  return groupDetectionsByGroup(detections);
}

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
      if ((b.confidence || 0) !== (a.confidence || 0)) return (b.confidence || 0) - (a.confidence || 0);
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }

  return out;
}

module.exports = { groupDetections, groupDetectionsByGroup };
