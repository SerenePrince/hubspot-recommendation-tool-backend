// backend/src/core/report/recommendations.js
const fs = require("node:fs");
const path = require("node:path");
const { validateMapping } = require("./mappingValidator");

let cachedMapping = null;

function getDefaultMappingPath() {
  return path.resolve(__dirname, "../../../data/alternatives/hubspot-mapping.json");
}

function ensureMappingLoaded(mappingPath) {
  if (cachedMapping) return cachedMapping;

  const p = mappingPath || getDefaultMappingPath();

  try {
    const raw = fs.readFileSync(p, "utf8");
    const loaded = JSON.parse(raw);

    const validation = validateMapping(loaded);
    if (!validation.ok) {
      console.error("Recommendation mapping is invalid. Falling back to empty mapping.");
      for (const err of validation.errors.slice(0, 50)) console.error(" -", err);
      cachedMapping = {};
    } else {
      cachedMapping = loaded;
    }
  } catch (e) {
    console.error("Failed to load recommendation mapping. Falling back to empty mapping.");
    console.error(e?.message || e);
    cachedMapping = {};
  }

  return cachedMapping;
}

function priorityWeight(p) {
  if (p === "high") return 3;
  if (p === "medium") return 2;
  if (p === "low") return 1;
  return 1;
}

function computeScore(rec) {
  let score = priorityWeight(rec.priority);
  const n = Array.isArray(rec.triggeredBy) ? rec.triggeredBy.length : 0;
  score += Math.min(3, n);

  if (rec.triggerType === "technology") score += 2;
  if (rec.triggerType === "categoryId" || rec.triggerType === "category") score += 1;
  if (rec.triggerType === "groupId" || rec.triggerType === "group") score += 0.5;

  return score;
}

function recKey(rec) {
  return `${(rec.title || "").trim().toLowerCase()}||${(rec.hubspotProduct || "").trim().toLowerCase()}`;
}

function buildRecommendations(detections, options = {}) {
  const { mappingPath, minConfidence = 50 } = options;
  const mapping = ensureMappingLoaded(mappingPath);

  const filtered = (detections || []).filter((d) => (d?.confidence || 0) >= minConfidence);

  const recs = [];
  const addAll = (items, triggerType, key, matched) => {
    for (const r of items || []) {
      if (!r) continue;
      recs.push({
        ...r,
        triggerType,
        triggeredBy: [{ triggerType, key, matched }],
      });
    }
  };

  const byTechnology = mapping.byTechnology || {};
  for (const d of filtered) {
    const techKey = (d.name || d.slug || "").trim();
    if (!techKey) continue;
    if (byTechnology[techKey]) addAll(byTechnology[techKey], "technology", techKey, techKey);
  }

  const byCategory = mapping.byCategory || {};
  const byCategoryId = mapping.byCategoryId || {};
  for (const d of filtered) {
    const cats = Array.isArray(d.categories) ? d.categories : [];
    for (const c of cats) {
      if (c?.name && byCategory[c.name]) addAll(byCategory[c.name], "category", c.name, c.name);
      if (c?.id && byCategoryId[c.id]) addAll(byCategoryId[c.id], "categoryId", c.id, c.name || c.id);
    }
  }

  const byGroup = mapping.byGroup || {};
  const byGroupId = mapping.byGroupId || {};
  for (const d of filtered) {
    const groups = Array.isArray(d.groups) ? d.groups : [];
    for (const g of groups) {
      if (g?.name && byGroup[g.name]) addAll(byGroup[g.name], "group", g.name, g.name);
      if (g?.id && byGroupId[g.id]) addAll(byGroupId[g.id], "groupId", g.id, g.name || g.id);
    }
  }

  // Merge duplicates by (title, hubspotProduct), union triggeredBy.
  // Preserve report-aligned optional fields like `reason` and `inboxOffer`.
  const merged = new Map();
  for (const r of recs) {
    const k = recKey(r);
    const existing = merged.get(k);

    if (!existing) {
      merged.set(k, {
        title: r.title,
        hubspotProduct: r.hubspotProduct,
        priority: r.priority,

        // Common optionals
        description: r.description ?? null,
        url: r.url ?? null,
        tags: Array.isArray(r.tags) ? r.tags : [],

        // Mapping-specific optionals (present in your hubspot-mapping.json)
        reason: r.reason ?? null,
        inboxOffer: r.inboxOffer ?? null,

        triggeredBy: Array.isArray(r.triggeredBy) ? r.triggeredBy.slice() : [],
        triggerType: r.triggerType,
      });
      continue;
    }

    // Keep highest priority if conflict (rare)
    existing.priority = pickHigherPriority(existing.priority, r.priority);

    // Prefer non-empty optional fields
    existing.description = existing.description || r.description || null;
    existing.url = existing.url || r.url || null;
    existing.reason = existing.reason || r.reason || null;
    existing.inboxOffer = existing.inboxOffer || r.inboxOffer || null;

    // Merge tags
    const tags = new Set([...(existing.tags || []), ...(Array.isArray(r.tags) ? r.tags : [])].map(String));
    existing.tags = Array.from(tags).filter((t) => t.trim());

    // Merge triggeredBy
    existing.triggeredBy = dedupeTriggeredBy([...(existing.triggeredBy || []), ...(r.triggeredBy || [])]);

    // Keep more specific triggerType if possible
    existing.triggerType = pickMoreSpecificTrigger(existing.triggerType, r.triggerType);

    merged.set(k, existing);
  }

  const out = Array.from(merged.values()).map((r) => ({
    ...r,
    score: computeScore(r),
  }));

  out.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return String(a.title || "").localeCompare(String(b.title || ""));
  });

  return capGroupNoise(out);
}

function pickHigherPriority(a, b) {
  const w = (p) => (p === "high" ? 3 : p === "medium" ? 2 : p === "low" ? 1 : 1);
  return w(b) > w(a) ? b : a;
}

function pickMoreSpecificTrigger(a, b) {
  const w = (t) => {
    if (t === "technology") return 4;
    if (t === "categoryId" || t === "category") return 3;
    if (t === "groupId" || t === "group") return 2;
    return 1;
  };
  return w(b) > w(a) ? b : a;
}

function dedupeTriggeredBy(items) {
  const seen = new Set();
  const out = [];
  for (const t of items || []) {
    const key = `${t.triggerType || ""}||${t.key || ""}||${t.matched || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

function capGroupNoise(recs) {
  const bestByProduct = new Map();

  for (const r of recs) {
    if (r.triggerType !== "group") continue;
    const productKey = String((r.hubspotProduct || "__none__")).trim();
    const best = bestByProduct.get(productKey);
    if (!best || (r.score || 0) > (best.score || 0)) bestByProduct.set(productKey, r);
  }

  const kept = [];
  for (const r of recs) {
    if (r.triggerType !== "group") {
      kept.push(r);
      continue;
    }
    const productKey = String((r.hubspotProduct || "__none__")).trim();
    if (bestByProduct.get(productKey) === r) kept.push(r);
  }

  return kept;
}

module.exports = { buildRecommendations, ensureMappingLoaded, getDefaultMappingPath };
