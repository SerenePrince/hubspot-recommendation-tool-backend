// backend/src/core/report/cleanReport.js

const { ensureMappingLoaded, getDefaultMappingPath } = require("./recommendations");

const asArray = (v) => (Array.isArray(v) ? v : []);
const slimTaxonomy = (items) => asArray(items).map((x) => ({ id: x.id, name: x.name }));
const slimGroupItem = (d) => ({
  name: d.name,
  confidence: d.confidence,
  version: d.version ?? null,
});

function priorityWeight(p) {
  if (p === "high") return 3;
  if (p === "medium") return 2;
  if (p === "low") return 1;
  return 1;
}

function buildByGroup(report, technologies) {
  const byGroup = {};

  if (report?.groups && typeof report.groups === "object") {
    for (const [groupName, items] of Object.entries(report.groups)) {
      byGroup[groupName] = asArray(items).map(slimGroupItem);
    }
    return byGroup;
  }

  for (const t of technologies) {
    const groupNames = asArray(t.groups).map((g) => g.name).filter(Boolean);
    const buckets = groupNames.length ? groupNames : ["Other"];

    for (const g of buckets) {
      if (!byGroup[g]) byGroup[g] = [];
      byGroup[g].push(slimGroupItem(t));
    }
  }

  for (const g of Object.keys(byGroup)) {
    byGroup[g].sort((a, b) => {
      if ((b.confidence || 0) !== (a.confidence || 0)) return (b.confidence || 0) - (a.confidence || 0);
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }

  return byGroup;
}

function cleanTriggeredBy(triggeredBy) {
  return asArray(triggeredBy).map((t) => ({
    triggerType: t.triggerType ?? null,
    key: t.key ?? null,
    matched: t.matched ?? null,
  }));
}

function cleanRecommendations(recs) {
  const out = [];
  for (const r of asArray(recs)) {
    if (!r) continue;

    out.push({
      title: r.title,
      hubspotProduct: r.hubspotProduct,
      priority: r.priority,

      // Common optional fields
      description: r.description ?? null,
      url: r.url ?? null,
      tags: asArray(r.tags).map(String),

      // Mapping-specific fields present in your hubspot-mapping.json
      reason: r.reason ?? null,
      inboxOffer: r.inboxOffer ?? null,

      triggeredBy: cleanTriggeredBy(r.triggeredBy),
    });
  }

  out.sort((a, b) => {
    const pa = priorityWeight(a.priority);
    const pb = priorityWeight(b.priority);
    if (pb !== pa) return pb - pa;
    return String(a.title || "").localeCompare(String(b.title || ""));
  });

  return out;
}

function buildSimpleReport(report, options = {}) {
  const { includeMeta = false } = options;

  const recommendationsIndex = buildTechnologyRecommendationsIndex(report?.recommendations);

  const technologies = asArray(report?.detections).map((d) => ({
    name: d.name,
    confidence: d.confidence,
    version: d.version ?? null,
    description: d.description ?? null,
    website: d.website ?? null,
    icon: d.icon ?? null,
    categories: slimTaxonomy(d.categories),
    groups: slimTaxonomy(d.groups),

    recommendedProducts: recommendationsIndex.get(d.name) || [],
  }));

  ensureMappingLoaded(getDefaultMappingPath());

  const byGroup = buildByGroup(report, technologies);

  const payload = {
    ok: report?.ok === true,
    url: report?.url ?? null,
    finalUrl: report?.finalUrl ?? null,
    technologies,
    byGroup,
    recommendations: cleanRecommendations(report?.recommendations),
    summary: report?.summary ?? null,
  };

  if (includeMeta) {
    payload.meta = {
      fetch: report?.fetch ?? null,
      timings: report?.timings ?? null,
    };
  }

  return payload;
}

function buildCleanReport(report) {
  return buildSimpleReport(report, { includeMeta: true });
}

function buildTechnologyRecommendationsIndex(recommendations) {
  const index = new Map();

  for (const rec of recommendations || []) {
    for (const trigger of rec.triggeredBy || []) {
      if (trigger.triggerType !== "technology") continue;

      const techName = trigger.key;
      if (!techName) continue;

      if (!index.has(techName)) index.set(techName, []);

      index.get(techName).push({
        hubspotProduct: rec.hubspotProduct,
        priority: rec.priority,
        reason: rec.reason ?? null,
      });
    }
  }

  // Deduplicate per technology + product
  for (const [tech, items] of index.entries()) {
    const seen = new Set();
    index.set(
      tech,
      items.filter((i) => {
        const key = `${i.hubspotProduct}||${i.priority}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }),
    );
  }

  return index;
}

module.exports = { buildSimpleReport, buildCleanReport };
