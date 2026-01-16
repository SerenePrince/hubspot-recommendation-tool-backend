// backend/src/core/report/cleanReport.js

/**
 * Build a compact, frontend-friendly JSON payload from a full analysis report.
 *
 * Intended consumers:
 * - React UI
 * - CRM/marketing dashboards that only need the "story" (stack + recs)
 */

function buildCleanReport(report, options = {}) {
  const includeMeta = options.includeMeta === true;

  const detections = Array.isArray(report?.detections) ? report.detections : [];
  const recommendations = Array.isArray(report?.recommendations)
    ? report.recommendations
    : [];
  const nextActions = Array.isArray(report?.nextActions)
    ? report.nextActions
    : [];

  // Minimal tech objects (easy to render as cards/badges)
  const technologies = detections.map((d) => ({
    name: d.name,
    confidence: d.confidence,
    version: d.version ?? null,
    categories: (d.categories || []).map((c) => ({ id: c.id, name: c.name })),
    groups: (d.groups || []).map((g) => ({ id: g.id, name: g.name })),
  }));

  // Convenience: a group->tech list map for quick UI grouping
  const byGroup = {};
  for (const t of technologies) {
    const groupNames = (t.groups || []).map((g) => g.name).filter(Boolean);
    const buckets = groupNames.length ? groupNames : ["Other"];
    for (const gName of buckets) {
      if (!byGroup[gName]) byGroup[gName] = [];
      byGroup[gName].push({
        name: t.name,
        confidence: t.confidence,
        version: t.version,
      });
    }
  }
  for (const gName of Object.keys(byGroup)) {
    byGroup[gName].sort((a, b) => {
      if ((b.confidence || 0) !== (a.confidence || 0))
        return (b.confidence || 0) - (a.confidence || 0);
      return (a.name || "").localeCompare(b.name || "");
    });
  }

  // Slim recommendation objects (keeps the HubSpot angle, drops internal fields)
  const hubspotRecommendations = recommendations.map((r) => ({
    title: r.title,
    priority: r.priority || "low",
    hubspotProduct: r.hubspotProduct ?? null,
    inboxOffer: r.inboxOffer ?? null,
    reason: r.reason ?? null,
    trigger: {
      type: r.triggerType ?? null,
      value: r.triggerValue ?? null,
    },
    triggeredBy: (r.triggeredBy || []).map((t) => ({
      technology: t.technology,
      confidence: t.confidence,
    })),
  }));

  const hubspotNextActions = nextActions.map((a) => ({
    title: a.title,
    priority: a.priority || "low",
    relatedProducts: a.relatedProducts || [],
    why: a.why ?? null,
  }));

  const payload = {
    ok: true,
    url: report?.url ?? null,
    finalUrl: report?.finalUrl ?? null,
    technologies,
    byGroup,
    hubspot: {
      recommendations: hubspotRecommendations,
      nextActions: hubspotNextActions,
    },
  };

  if (includeMeta) {
    payload.meta = {
      cache: report?.cache ?? null,
      timings: report?.timings ?? null,
      fetch: report?.fetch
        ? {
            status: report.fetch.status,
            contentType: report.fetch.contentType,
            bytes: report.fetch.bytes,
            timingMs: report.fetch.timingMs,
          }
        : null,
      summary: report?.summary ?? null,
    };
  }

  return payload;
}

module.exports = { buildCleanReport };
