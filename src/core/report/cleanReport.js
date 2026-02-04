// backend/src/core/report/cleanReport.js
//
// "Clean" report builder used by both:
// - API (frontend-friendly response)
// - CLI (human output consumes this structure)
//
// Goal:
// - simple, stable shape for frontend devs
// - includes the information end-users want (like the CLI), without CLI formatting

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

function prioRank(p) {
  // lower is "better"
  if (p === "high") return 0;
  if (p === "medium") return 1;
  if (p === "low") return 2;
  return 3;
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

function summarizeTriggeredBy(triggeredBy, options = {}) {
  const items = asArray(triggeredBy);
  if (!items.length) return null;

  const maxItems = Number.isFinite(options.maxItems) ? Math.max(1, Math.floor(options.maxItems)) : 3;

  const out = [];
  for (const t of items) {
    const type = String(t?.triggerType || "").trim();
    const key = String(t?.key || t?.matched || "").trim();
    if (!type || !key) continue;

    if (type === "technology") out.push(`Tech: ${key}`);
    else if (type === "category") out.push(`Category: ${key}`);
    else if (type === "group") out.push(`Group: ${key}`);
    else out.push(`${type}: ${key}`);

    if (out.length >= maxItems) break;
  }

  if (!out.length) return null;

  const remaining = Math.max(0, items.length - out.length);
  return remaining > 0 ? `${out.join("; ")}; +${remaining}` : out.join("; ");
}

function cleanRecommendations(recs) {
  const out = [];
  for (const r of asArray(recs)) {
    if (!r) continue;

    out.push({
      title: r.title,
      hubspotProduct: r.hubspotProduct,
      priority: r.priority,

      // Optional presentation fields (documented)
      description: r.description ?? null,
      url: r.url ?? null,
      tags: asArray(r.tags).map(String),

      // Traceability
      triggeredBy: cleanTriggeredBy(r.triggeredBy),
      triggeredBySummary: summarizeTriggeredBy(r.triggeredBy) ?? null,
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

/**
 * Build: techName -> ordered products array (primary-first).
 * We preserve "primary first" using:
 * - best priority rank across recommendations producing that product
 * - then earliest first-seen recommendation order
 */
function buildTechnologyProductsIndex(recommendations) {
  const index = new Map();

  (recommendations || []).forEach((rec, recIndex) => {
    const product = String(rec?.hubspotProduct || "").trim();
    if (!product) return;

    const rank = prioRank(rec?.priority);
    const triggers = asArray(rec?.triggeredBy);

    for (const trigger of triggers) {
      if (trigger?.triggerType !== "technology") continue;

      const techName = trigger.key;
      if (!techName) continue;

      if (!index.has(techName)) index.set(techName, new Map());

      const productMap = index.get(techName);

      if (!productMap.has(product)) {
        productMap.set(product, {
          hubspotProduct: product,
          bestPriorityRank: rank,
          priority: rec.priority,
          firstSeen: recIndex,
          // Useful for UI tooltips; keep it short.
          description: rec.description ?? null,
          title: rec.title ?? null,
        });
      } else {
        const meta = productMap.get(product);
        meta.bestPriorityRank = Math.min(meta.bestPriorityRank, rank);
        meta.firstSeen = Math.min(meta.firstSeen, recIndex);
        // Prefer to keep the highest priority label if we improve rank
        if (rank < prioRank(meta.priority)) meta.priority = rec.priority;
        if (!meta.description && rec.description) meta.description = rec.description;
      }
    }
  });

  // Convert per-tech maps to ordered arrays
  const ordered = new Map();
  for (const [tech, productMap] of index.entries()) {
    const arr = Array.from(productMap.values())
      .sort((a, b) => {
        if (a.bestPriorityRank !== b.bestPriorityRank) return a.bestPriorityRank - b.bestPriorityRank;
        return a.firstSeen - b.firstSeen;
      })
      .map((x) => ({
        hubspotProduct: x.hubspotProduct,
        priority: x.priority,
        title: x.title,
        description: x.description,
      }));

    ordered.set(tech, arr);
  }

  return ordered;
}

function computeCounts(technologies, recommendations) {
  const categorySet = new Set();
  const groupSet = new Set();

  for (const t of technologies) {
    for (const c of asArray(t.categories)) categorySet.add(c?.name);
    for (const g of asArray(t.groups)) groupSet.add(g?.name);
  }

  // Coverage: techs that have at least one ordered product recommendation
  const techsWithProducts = technologies.filter((t) => asArray(t.hubspot?.products).length > 0).length;

  return {
    technologiesDetected: technologies.length,
    categories: Array.from(categorySet).filter(Boolean).length,
    groups: Array.from(groupSet).filter(Boolean).length,
    recommendations: recommendations.length,
    mappedReplacements: {
      technologiesWithReplacements: techsWithProducts,
      totalTechnologies: technologies.length,
    },
  };
}

function buildTopRecommendations(recommendations, max = 5) {
  return recommendations
    .slice()
    .sort((a, b) => {
      const pa = prioRank(a.priority);
      const pb = prioRank(b.priority);
      if (pa !== pb) return pa - pb;
      return String(a.title || "").localeCompare(String(b.title || ""));
    })
    .slice(0, max)
    .map((r) => ({
      title: r.title,
      hubspotProduct: r.hubspotProduct,
      priority: r.priority,
      description: r.description ?? null,
      triggeredBySummary: r.triggeredBySummary ?? null,
    }));
}

function buildSimpleReport(report, options = {}) {
  const { includeMeta = false } = options;

  // Ensure mapping is loaded for deterministic recommendation shapes.
  ensureMappingLoaded(getDefaultMappingPath());

  const cleanedRecs = cleanRecommendations(report?.recommendations);

  const productsIndex = buildTechnologyProductsIndex(cleanedRecs);

  const technologies = asArray(report?.detections).map((d) => {
    const products = productsIndex.get(d.name) || [];
    return {
      name: d.name,
      confidence: d.confidence,
      version: d.version ?? null,
      description: d.description ?? null,
      website: d.website ?? null,
      icon: d.icon ?? null,
      categories: slimTaxonomy(d.categories),
      groups: slimTaxonomy(d.groups),

      // Frontend-friendly HubSpot info (primary-first)
      hubspot: {
        products,
        primaryProduct: products[0]?.hubspotProduct ?? null,
      },
    };
  });

  const byGroup = buildByGroup(report, technologies);

  const totals = computeCounts(technologies, cleanedRecs);
  const topRecommendations = buildTopRecommendations(cleanedRecs, 5);

  const payload = {
    ok: report?.ok === true,

    // Stable version marker for frontend integration.
    apiVersion: "2.0",

    url: report?.url ?? null,
    finalUrl: report?.finalUrl ?? null,

    // Primary UI payload
    technologies,
    byGroup,
    recommendations: cleanedRecs,

    // Frontend summary (mirrors CLI usefulness)
    summary: {
      totals,
      topRecommendations,
    },
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

module.exports = { buildSimpleReport, buildCleanReport };
