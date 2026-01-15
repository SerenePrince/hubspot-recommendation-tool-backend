// backend/src/core/report/nextActions.js
const fs = require("fs");
const path = require("path");
const { validateNextActionsConfig } = require("./nextActionsValidator");

let cachedConfig = null;

function getDefaultConfigPath() {
  return path.resolve(
    __dirname,
    "../../../../data/alternatives/inbox-next-actions.json"
  );
}

function loadConfig(configPath) {
  const raw = fs.readFileSync(configPath, "utf8");
  return JSON.parse(raw);
}

function buildNextActions(recommendations, options = {}) {
  const configPath = options.configPath || getDefaultConfigPath();

  const cfg = getConfig(configPath);
  const max = Number.isFinite(options.max) ? options.max : cfg.max || 5;

  const products = new Set(
    (recommendations || [])
      .flatMap((r) => splitProducts(r.hubspotProduct))
      .map((p) => p.toLowerCase())
      .filter(Boolean)
  );

  const actions = [];

  // rules
  for (const rule of cfg.rules || []) {
    const any = (rule.when?.productsAny || []).map((p) => p.toLowerCase());
    if (any.some((p) => products.has(p))) {
      for (const a of rule.actions || []) actions.push(a);
    }
  }

  // always
  for (const a of cfg.always || []) actions.push(a);

  const deduped = dedupeByTitle(actions);
  deduped.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));

  return deduped.slice(0, max);
}

function getConfig(configPath) {
  if (cachedConfig && cachedConfig.path === configPath) return cachedConfig.cfg;

  try {
    const loaded = loadConfig(configPath);
    const validation = validateNextActionsConfig(loaded);

    if (!validation.ok) {
      console.error("Next actions config invalid. Falling back to defaults.");
      for (const e of validation.errors.slice(0, 50)) console.error(" -", e);
      cachedConfig = { path: configPath, cfg: getDefaultFallback() };
      return cachedConfig.cfg;
    }

    cachedConfig = { path: configPath, cfg: loaded };
    return loaded;
  } catch (e) {
    // file missing or invalid JSON -> fallback
    cachedConfig = { path: configPath, cfg: getDefaultFallback() };
    return cachedConfig.cfg;
  }
}

function getDefaultFallback() {
  return { max: 5, rules: [], always: [] };
}

function splitProducts(hubspotProduct) {
  if (!hubspotProduct) return [];
  // supports "Marketing Hub / Content Hub" etc.
  return String(hubspotProduct)
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
}

function priorityRank(p) {
  if (p === "high") return 0;
  if (p === "medium") return 1;
  return 2;
}

function dedupeByTitle(items) {
  const map = new Map();
  for (const it of items) {
    const key = (it.title || "").trim().toLowerCase();
    if (!key) continue;

    const existing = map.get(key);
    if (!existing) map.set(key, it);
    else if (priorityRank(it.priority) < priorityRank(existing.priority))
      map.set(key, it);
  }
  return Array.from(map.values());
}

module.exports = { buildNextActions };
