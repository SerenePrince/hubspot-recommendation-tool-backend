// backend/src/core/report/recommendations.js
const fs = require("fs");
const path = require("path");
const { validateMapping } = require("./mappingValidator");

let cachedMapping = null;

function priorityWeight(p) {
  if (p === "high") return 3;
  if (p === "medium") return 2;
  if (p === "low") return 1;
  return 1;
}

function computeScore(rec) {
  // base score from priority
  let score = priorityWeight(rec.priority);

  // more triggeredBy items = higher relevance
  const n = Array.isArray(rec.triggeredBy) ? rec.triggeredBy.length : 0;
  score += Math.min(3, n); // cap boost

  // technology triggers are more specific than group/category triggers
  if (rec.triggerType === "technology") score += 2;
  if (rec.triggerType === "categoryId" || rec.triggerType === "category")
    score += 1;
  if (rec.triggerType === "groupId" || rec.triggerType === "group")
    score += 0.5;

  return score;
}

function recKey(rec) {
  return `${(rec.title || "").trim().toLowerCase()}||${(
    rec.hubspotProduct || ""
  )
    .trim()
    .toLowerCase()}`;
}

function getDefaultMappingPath() {
  return path.resolve(
    __dirname,
    "../../../../data/alternatives/hubspot-mapping.json"
  );
}

function loadMapping(mappingPath) {
  const raw = fs.readFileSync(mappingPath, "utf8");
  return JSON.parse(raw);
}

/**
 * Mapping format:
 * {
 *   byTechnology: { [techName]: RecommendationItem[] },
 *   byGroup:      { [groupName]: RecommendationItem[] },
 *   byCategory:   { [categoryName]: RecommendationItem[] }
 * }
 *
 * RecommendationItem: { title, hubspotProduct, reason, priority }
 */
function buildRecommendations(detections, options = {}) {
  const mappingPath = options.mappingPath || getDefaultMappingPath();
  const minConfidence = Number.isFinite(options.minConfidence)
    ? options.minConfidence
    : 70;

  if (!cachedMapping) {
    try {
      const loaded = loadMapping(mappingPath);
      const validation = validateMapping(loaded);

      if (!validation.ok) {
        console.error(
          "Recommendation mapping is invalid. Falling back to empty mapping."
        );
        for (const err of validation.errors.slice(0, 50)) {
          console.error(" -", err);
        }
        cachedMapping = {};
      } else {
        cachedMapping = loaded;
      }
    } catch (e) {
      console.error(
        "Failed to load recommendation mapping. Falling back to empty mapping."
      );
      console.error(e?.message || e);
      cachedMapping = {};
    }
  }

  const byTechnology = cachedMapping.byTechnology || {};

  const byCategory = cachedMapping.byCategory || {};
  const byCategoryId = cachedMapping.byCategoryId || {};

  const byGroup = cachedMapping.byGroup || {};
  const byGroupId = cachedMapping.byGroupId || {};

  const outMap = new Map();

  for (const d of detections || []) {
    const conf = d.confidence || 0;
    if (conf < minConfidence) continue;

    const techName = d.name;

    const groupObjs = (d.groups || [])
      .map((g) => ({
        id: g.id != null ? String(g.id) : null,
        name: g.name || null,
      }))
      .filter((g) => g.id || g.name);

    const categoryObjs = (d.categories || [])
      .map((c) => ({
        id: c.id != null ? String(c.id) : null,
        name: c.name || null,
      }))
      .filter((c) => c.id || c.name);

    // 1) Technology-triggered recs
    pushItems(outMap, byTechnology[techName], {
      triggerType: "technology",
      triggerValue: techName,
      detection: d,
    });

    for (const c of categoryObjs) {
      if (c.id && byCategoryId[c.id]) {
        pushItems(outMap, byCategoryId[c.id], {
          triggerType: "categoryId",
          triggerValue: c.id,
          detection: d,
        });
      }

      if (c.name && byCategory[c.name]) {
        pushItems(outMap, byCategory[c.name], {
          triggerType: "category",
          triggerValue: c.name,
          detection: d,
        });
      }
    }

    for (const g of groupObjs) {
      if (g.id && byGroupId[g.id]) {
        pushItems(outMap, byGroupId[g.id], {
          triggerType: "groupId",
          triggerValue: g.id,
          detection: d,
        });
      }

      if (g.name && byGroup[g.name]) {
        pushItems(outMap, byGroup[g.name], {
          triggerType: "group",
          triggerValue: g.name,
          detection: d,
        });
      }
    }
  }

  const out = Array.from(outMap.values());

  // Sort triggeredBy list for readability (highest confidence first)
  for (const r of out) {
    r.triggeredBy.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  }

  sortRecommendations(out);
  const capped = capGroupRecommendations(out, { maxPerProduct: 1 });

  const final = finalizeRecommendations(capped, {
    max: options.maxRecommendations ?? 8,
  });

  return final;
}

function finalizeRecommendations(recs, { max = 8 } = {}) {
  const map = new Map();

  for (const r of recs) {
    const key = recKey(r);

    // normalize fields
    const rec = {
      ...r,
      priority: r.priority || "low",
      triggeredBy: Array.isArray(r.triggeredBy) ? r.triggeredBy : [],
    };

    const existing = map.get(key);
    if (!existing) {
      map.set(key, rec);
      continue;
    }

    // Merge duplicates:
    // - keep higher priority
    // - union triggeredBy
    const pA = priorityWeight(existing.priority);
    const pB = priorityWeight(rec.priority);
    if (pB > pA) existing.priority = rec.priority;

    // merge triggeredBy (unique by technology  )
    const seen = new Set(existing.triggeredBy.map((t) => t.technology));
    for (const t of rec.triggeredBy) {
      if (!seen.has(t.technology)) {
        existing.triggeredBy.push(t);
        seen.add(t.name);
      }
    }

    // if reason differs, keep the longer one (usually more informative)
    if ((rec.reason || "").length > (existing.reason || "").length) {
      existing.reason = rec.reason;
    }

    // keep inboxOffer if missing
    if (!existing.inboxOffer && rec.inboxOffer)
      existing.inboxOffer = rec.inboxOffer;

    map.set(key, existing);
  }

  const out = Array.from(map.values()).map((r) => ({
    ...r,
    score: computeScore(r),
  }));

  out.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // tie-break: priority, then title
    const pb = priorityWeight(b.priority);
    const pa = priorityWeight(a.priority);
    if (pb !== pa) return pb - pa;
    return (a.title || "").localeCompare(b.title || "");
  });

  const trimmed = out.slice(0, max).map(({ score, ...rest }) => rest);

  // Keep at most 2 recs per HubSpot product (reduces repetition)
  const perProduct = consolidateByProduct(trimmed, { maxPerProduct: 2 });

  // If consolidation reduced count too much, it's fine; otherwise cap again
  return perProduct.slice(0, max);
}

function consolidateByProduct(recs, { maxPerProduct = 2 } = {}) {
  const byProduct = new Map();

  for (const r of recs) {
    const product = (r.hubspotProduct || "__none__").trim();
    if (!byProduct.has(product)) byProduct.set(product, []);
    byProduct.get(product).push(r);
  }

  const out = [];

  for (const [product, list] of byProduct.entries()) {
    // sort best-first using the same scoring you already do
    const scored = list
      .map((r) => ({ ...r, _score: computeScore(r) }))
      .sort((a, b) => b._score - a._score);

    const kept = scored
      .slice(0, maxPerProduct)
      .map(({ _score, ...rest }) => rest);

    // If we dropped some, merge their triggers into the best one (kept[0])
    if (scored.length > maxPerProduct && kept.length) {
      const best = kept[0];
      const seen = new Set((best.triggeredBy || []).map((t) => t.technology));
      for (const dropped of scored.slice(maxPerProduct)) {
        for (const t of dropped.triggeredBy || []) {
          if (!seen.has(t.technology)) {
            best.triggeredBy.push(t);
            seen.add(t.technology);
          }
        }
      }
    }

    out.push(...kept);
  }

  // final sort again by score
  const final = out
    .map((r) => ({ ...r, _score: computeScore(r) }))
    .sort((a, b) => b._score - a._score)
    .map(({ _score, ...rest }) => rest);

  return final;
}

function pushItems(outMap, items, ctx) {
  if (!items || !Array.isArray(items)) return;

  for (const item of items) {
    const title = item?.title || "";
    if (!title) continue;

    // Dedupe by rule identity (NOT by detection)
    const dedupeKey = `${ctx.triggerType}:${ctx.triggerValue}::${title}`;

    const existing = outMap.get(dedupeKey);
    if (!existing) {
      outMap.set(dedupeKey, {
        triggerType: ctx.triggerType,
        triggerValue: ctx.triggerValue,

        // Aggregate which detected technologies caused this rec
        triggeredBy: [
          {
            technology: ctx.detection.name,
            confidence: ctx.detection.confidence,
          },
        ],

        title,
        hubspotProduct: item.hubspotProduct || null,
        reason: item.reason || null,
        priority: item.priority || "low",
      });
    } else {
      // add this technology if not already present
      const tech = ctx.detection.name;
      if (!existing.triggeredBy.some((t) => t.technology === tech)) {
        existing.triggeredBy.push({
          technology: tech,
          confidence: ctx.detection.confidence,
        });
      }

      // Keep best priority if conflicts (high > medium > low)
      existing.priority = bestPriority(existing.priority, item.priority);
    }
  }
}

function bestPriority(a, b) {
  const rank = { high: 0, medium: 1, low: 2 };
  const ra = rank[a] ?? 9;
  const rb = rank[b] ?? 9;
  return ra <= rb ? a : b;
}

function sortRecommendations(recs) {
  const priorityRank = { high: 0, medium: 1, low: 2 };
  recs.sort((a, b) => {
    const pa = priorityRank[a.priority] ?? 9;
    const pb = priorityRank[b.priority] ?? 9;
    if (pa !== pb) return pa - pb;
    return (b.confidence || 0) - (a.confidence || 0);
  });
}

function capGroupRecommendations(recs, options = {}) {
  const maxPerProduct = Number.isFinite(options.maxPerProduct)
    ? options.maxPerProduct
    : 1;

  const kept = [];
  const groupCountByProduct = new Map();

  for (const r of recs) {
    if (r.triggerType !== "group") {
      kept.push(r);
      continue;
    }

    const productKey = r.hubspotProduct || "__none__";
    const current = groupCountByProduct.get(productKey) || 0;

    if (current < maxPerProduct) {
      kept.push(r);
      groupCountByProduct.set(productKey, current + 1);
    }
    // else drop it
  }

  return kept;
}

module.exports = { buildRecommendations };
