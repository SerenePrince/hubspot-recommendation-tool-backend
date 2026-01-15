// backend/src/cli/formatPretty.js

function formatPrettyReport(report, options = {}) {
  const maxEvidence = options.allEvidence ? Infinity : options.maxEvidence ?? 3;
  const lines = [];

  lines.push(`URL: ${report.finalUrl || report.url}`);
  if (report.fetch) {
    lines.push(
      `Fetch: ${report.fetch.status} • ${
        report.fetch.contentType || "unknown"
      } • ${report.fetch.bytes} bytes • ${report.fetch.timingMs}ms`
    );
    const h = report.fetch.headers || {};
    const headerBits = [];
    if (h.server) headerBits.push(`server=${h.server}`);
    if (h["x-powered-by"]) headerBits.push(`x-powered-by=${h["x-powered-by"]}`);
    if (h["cf-cache-status"])
      headerBits.push(`cf-cache=${h["cf-cache-status"]}`);
    if (h["x-vercel-cache"])
      headerBits.push(`vercel-cache=${h["x-vercel-cache"]}`);
    if (headerBits.length) lines.push(`Headers: ${headerBits.join(" • ")}`);
  }

  if (report.summary?.countsByGroup) {
    const topGroups = Object.entries(report.summary.countsByGroup).slice(0, 5);
    if (topGroups.length) {
      lines.push(
        `Top areas: ${topGroups.map(([k, v]) => `${k} (${v})`).join(" • ")}`
      );
    }
  }

  const detections = Array.isArray(report.detections) ? report.detections : [];
  lines.push("");
  lines.push(`Detections (${detections.length}):`);

  // Group by top-level group name (e.g., Analytics/Content/Servers/etc.)
  const byGroup = new Map();
  for (const d of detections) {
    const groups = (d.groups || []).map((g) => g.name).filter(Boolean);
    const bucketNames = groups.length ? groups : ["Other"];
    for (const gName of bucketNames) {
      if (!byGroup.has(gName)) byGroup.set(gName, []);
      byGroup.get(gName).push(d);
    }
  }

  // Sort groups and techs
  const groupNames = Array.from(byGroup.keys()).sort((a, b) =>
    a.localeCompare(b)
  );
  for (const gName of groupNames) {
    lines.push("");
    lines.push(`== ${gName} ==`);

    const items = byGroup
      .get(gName)
      .slice()
      .sort((a, b) => {
        if (b.confidence !== a.confidence) return b.confidence - a.confidence;
        return a.name.localeCompare(b.name);
      });

    for (const d of items) {
      const version = d.version ? ` ${d.version}` : "";
      lines.push(`- ${d.name}${version} (confidence ${d.confidence})`);

      // Categories (names only)
      const catNames = (d.categories || []).map((c) => c.name).filter(Boolean);
      if (catNames.length) {
        lines.push(`  categories: ${unique(catNames).join(", ")}`);
      }

      // Evidence summary (first 3)
      const ev = Array.isArray(d.evidence) ? d.evidence : [];
      for (const e of ev.slice(0, maxEvidence)) {
        if (e.type === "header") {
          lines.push(`  evidence: header[${e.key}] matched ${e.pattern}`);
          continue;
        }

        if (e.type === "meta") {
          lines.push(`  evidence: meta[${e.key}] matched ${e.pattern}`);
          continue;
        }

        if (e.type === "dom") {
          // Two cases: selector presence OR regex match against text/attr
          if (e.pattern) {
            const extra = e.detail ? ` (${e.detail})` : "";
            lines.push(
              `  evidence: dom selector "${e.selector}" matched ${e.pattern}${extra}`
            );
          } else {
            lines.push(`  evidence: dom selector "${e.selector}" present`);
          }
          continue;
        }

        // scripts/text/scriptSrc/url/cookie etc.
        if (e.pattern) {
          lines.push(`  evidence: ${e.type} matched ${e.pattern}`);
        } else {
          lines.push(`  evidence: ${e.type} matched`);
        }
      }

      if (!options.allEvidence && ev.length > maxEvidence) {
        lines.push(`  evidence: +${ev.length - maxEvidence} more`);
      }
    }
  }

  const recs = Array.isArray(report.recommendations)
    ? report.recommendations
    : [];
  if (recs.length) {
    lines.push("");
    lines.push(`Recommendations (${recs.length}):`);
    for (const r of recs.slice(0, 10)) {
      lines.push(`- ${r.title} [${r.priority}]`);

      const triggeredBy = (r.triggeredBy || [])
        .map((t) => `${t.technology} (${t.confidence})`)
        .join(", ");

      lines.push(`  trigger: ${r.triggerType}=${r.triggerValue}`);
      lines.push(`  triggered by: ${triggeredBy}`);

      if (r.hubspotProduct) lines.push(`  HubSpot: ${r.hubspotProduct}`);
      if (r.reason) lines.push(`  reason: ${r.reason}`);
    }
    if (recs.length > 10) lines.push(`- +${recs.length - 10} more`);
  }

  if (report.nextActions && report.nextActions.length) {
    lines.push("");
    lines.push(`Next actions (${report.nextActions.length}):`);
    for (const a of report.nextActions) {
      lines.push(`- ${a.title} [${a.priority}]`);
      if (a.relatedProducts?.length)
        lines.push(`  products: ${a.relatedProducts.join(", ")}`);
      if (a.why) lines.push(`  why: ${a.why}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

function unique(arr) {
  return Array.from(new Set(arr));
}

module.exports = { formatPrettyReport };
