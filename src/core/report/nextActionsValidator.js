// backend/src/core/report/nextActionsValidator.js

const ALLOWED_PRIORITIES = new Set(["high", "medium", "low"]);

function validateNextActionsConfig(cfg) {
  const errors = [];

  if (!cfg || typeof cfg !== "object" || Array.isArray(cfg)) {
    return {
      ok: false,
      errors: ["Next actions config must be a JSON object."],
    };
  }

  if (cfg.max != null && !Number.isFinite(cfg.max)) {
    errors.push("max must be a number if provided.");
  }

  if (cfg.rules != null) {
    if (!Array.isArray(cfg.rules))
      errors.push("rules must be an array if provided.");
    else cfg.rules.forEach((r, i) => validateRule(r, `rules[${i}]`, errors));
  }

  if (cfg.always != null) {
    if (!Array.isArray(cfg.always))
      errors.push("always must be an array if provided.");
    else
      cfg.always.forEach((a, i) => validateAction(a, `always[${i}]`, errors));
  }

  return { ok: errors.length === 0, errors };
}

function validateRule(rule, path, errors) {
  if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
    errors.push(`${path} must be an object.`);
    return;
  }

  if (!rule.when || typeof rule.when !== "object" || Array.isArray(rule.when)) {
    errors.push(`${path}.when must be an object.`);
  } else {
    if (rule.when.productsAny != null) {
      if (
        !Array.isArray(rule.when.productsAny) ||
        rule.when.productsAny.some((p) => typeof p !== "string")
      ) {
        errors.push(`${path}.when.productsAny must be an array of strings.`);
      }
    } else {
      errors.push(`${path}.when.productsAny is required (array of strings).`);
    }
  }

  if (!Array.isArray(rule.actions)) {
    errors.push(`${path}.actions must be an array.`);
    return;
  }

  rule.actions.forEach((a, i) =>
    validateAction(a, `${path}.actions[${i}]`, errors)
  );
}

function validateAction(action, path, errors) {
  if (!action || typeof action !== "object" || Array.isArray(action)) {
    errors.push(`${path} must be an object.`);
    return;
  }

  if (!isNonEmptyString(action.title))
    errors.push(`${path}.title is required.`);
  if (
    !isNonEmptyString(action.priority) ||
    !ALLOWED_PRIORITIES.has(action.priority)
  ) {
    errors.push(`${path}.priority must be one of: high, medium, low.`);
  }

  if (action.why != null && typeof action.why !== "string")
    errors.push(`${path}.why must be a string.`);
  if (action.relatedProducts != null) {
    if (
      !Array.isArray(action.relatedProducts) ||
      action.relatedProducts.some((p) => typeof p !== "string")
    ) {
      errors.push(`${path}.relatedProducts must be an array of strings.`);
    }
  }
}

function isNonEmptyString(x) {
  return typeof x === "string" && x.trim().length > 0;
}

module.exports = { validateNextActionsConfig };
