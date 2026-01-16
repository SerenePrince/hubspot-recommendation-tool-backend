const express = require("express");
const fs = require("fs");
const path = require("path");
const {
  validateNextActionsConfig,
} = require("../../core/report/nextActionsValidator");

const router = express.Router();

function getDefaultConfigPath() {
  return path.resolve(
    __dirname,
    "../../../../data/alternatives/inbox-next-actions.json",
  );
}

let cache = {
  loadedAt: null,
  cfg: null,
  validation: null,
  path: null,
};

function loadAndValidate(configPath) {
  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(raw);
  const validation = validateNextActionsConfig(parsed);
  return { cfg: parsed, validation };
}

function computeMeta(cfg) {
  const rules = Array.isArray(cfg.rules) ? cfg.rules : [];
  const always = Array.isArray(cfg.always) ? cfg.always : [];
  const ruleActions = rules.reduce(
    (sum, r) => sum + (Array.isArray(r.actions) ? r.actions.length : 0),
    0,
  );

  return {
    max: cfg.max ?? null,
    rules: rules.length,
    ruleActions,
    always: always.length,
    totalActions: ruleActions + always.length,
  };
}

router.get("/config/next-actions", (req, res) => {
  try {
    const configPath = getDefaultConfigPath();
    const include = req.query.include === "1" || req.query.include === "true";
    const pretty = req.query.pretty === "1" || req.query.pretty === "true";

    if (!cache.cfg || cache.path !== configPath) {
      const { cfg, validation } = loadAndValidate(configPath);
      cache = {
        loadedAt: new Date().toISOString(),
        cfg,
        validation,
        path: configPath,
      };
    }

    const payload = {
      ok: true,
      path: cache.path,
      loadedAt: cache.loadedAt,
      valid: !!cache.validation?.ok,
      errors: cache.validation?.ok
        ? []
        : (cache.validation?.errors || []).slice(0, 50),
      meta: computeMeta(cache.cfg || {}),
      ...(include ? { config: cache.cfg } : {}),
    };

    if (pretty) {
      res.setHeader("Content-Type", "application/json");
      return res.status(200).send(JSON.stringify(payload, null, 2));
    }

    return res.json(payload);
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to load next actions config",
    });
  }
});

module.exports = { nextActionsConfigRouter: router };
