const express = require("express");
const fs = require("fs");
const path = require("path");
const { validateMapping } = require("../../core/report/mappingValidator");

const router = express.Router();

function getDefaultMappingPath() {
  return path.resolve(
    __dirname,
    "../../../../data/alternatives/hubspot-mapping.json",
  );
}

let cache = {
  loadedAt: null,
  mapping: null,
  validation: null,
  path: null,
};

function loadAndValidateMapping(mappingPath) {
  const raw = fs.readFileSync(mappingPath, "utf8");
  const parsed = JSON.parse(raw);
  const validation = validateMapping(parsed);
  return { mapping: parsed, validation };
}

function computeMeta(mapping) {
  const byTechnology = mapping.byTechnology || {};
  const byCategory = mapping.byCategory || {};
  const byGroup = mapping.byGroup || {};

  const countItems = (obj) =>
    Object.values(obj).reduce(
      (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
      0,
    );

  return {
    keys: {
      byTechnology: Object.keys(byTechnology).length,
      byCategory: Object.keys(byCategory).length,
      byGroup: Object.keys(byGroup).length,
    },
    items: {
      byTechnology: countItems(byTechnology),
      byCategory: countItems(byCategory),
      byGroup: countItems(byGroup),
      total:
        countItems(byTechnology) + countItems(byCategory) + countItems(byGroup),
    },
  };
}

router.get("/config/recommendations", async (req, res) => {
  try {
    const mappingPath = getDefaultMappingPath();
    const include = req.query.include === "1" || req.query.include === "true";
    const pretty = req.query.pretty === "1" || req.query.pretty === "true";

    // simple cache: reload if first time; you can later improve with fs.stat mtime
    if (!cache.mapping || cache.path !== mappingPath) {
      const { mapping, validation } = loadAndValidateMapping(mappingPath);
      cache = {
        loadedAt: new Date().toISOString(),
        mapping,
        validation,
        path: mappingPath,
      };
    }

    const meta = computeMeta(cache.mapping || {});
    const payload = {
      ok: true,
      path: cache.path,
      loadedAt: cache.loadedAt,
      valid: !!cache.validation?.ok,
      errors: cache.validation?.ok
        ? []
        : (cache.validation?.errors || []).slice(0, 50),
      meta,
      ...(include ? { mapping: cache.mapping } : {}),
    };

    if (pretty) {
      res.setHeader("Content-Type", "application/json");
      return res.status(200).send(JSON.stringify(payload, null, 2));
    }

    return res.json(payload);
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to load recommendation config",
    });
  }
});

module.exports = { configRouter: router };
