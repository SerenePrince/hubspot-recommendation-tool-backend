// backend/src/core/report/mappingValidator.js

const ALLOWED_PRIORITIES = new Set(["high", "medium", "low"]);

function validateMapping(mapping) {
  const errors = [];

  if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) {
    return { ok: false, errors: ["Mapping must be a JSON object at the root."] };
  }

  validateSection(mapping, "byTechnology", errors);
  validateSection(mapping, "byCategory", errors);
  validateSection(mapping, "byGroup", errors);
  validateSection(mapping, "byCategoryId", errors);
  validateSection(mapping, "byGroupId", errors);

  return { ok: errors.length === 0, errors };
}

function validateSection(mapping, sectionName, errors) {
  const section = mapping[sectionName];
  if (section == null) return;

  if (!section || typeof section !== "object" || Array.isArray(section)) {
    errors.push(`${sectionName} must be an object of { key: RecommendationItem[] }.`);
    return;
  }

  for (const [key, arr] of Object.entries(section)) {
    if (!Array.isArray(arr)) {
      errors.push(`${sectionName}.${jsonKey(key)} must be an array of RecommendationItem.`);
      continue;
    }

    for (let i = 0; i < arr.length; i++) {
      validateRecommendationItem(arr[i], `${sectionName}.${jsonKey(key)}[${i}]`, errors);
    }
  }
}

function validateRecommendationItem(item, path, errors) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    errors.push(`${path} must be an object.`);
    return;
  }

  if (!isNonEmptyString(item.title)) errors.push(`${path}.title is required.`);
  if (!isNonEmptyString(item.hubspotProduct)) errors.push(`${path}.hubspotProduct is required.`);
  if (!isNonEmptyString(item.priority) || !ALLOWED_PRIORITIES.has(item.priority)) {
    errors.push(`${path}.priority must be one of: high, medium, low.`);
  }

  // Common optional fields
  if (item.description != null && !isString(item.description)) errors.push(`${path}.description must be a string if present.`);
  if (item.url != null && !isString(item.url)) errors.push(`${path}.url must be a string if present.`);
  if (item.tags != null && !Array.isArray(item.tags)) errors.push(`${path}.tags must be an array of strings if present.`);

  // Report-aligned optional fields present in your mapping
  if (item.reason != null && !isString(item.reason)) errors.push(`${path}.reason must be a string if present.`);
  if (item.inboxOffer != null && !isString(item.inboxOffer)) errors.push(`${path}.inboxOffer must be a string if present.`);

  if (Array.isArray(item.tags)) {
    for (const t of item.tags) {
      if (!isString(t)) errors.push(`${path}.tags must contain only strings.`);
    }
  }
}

function jsonKey(k) {
  try {
    return JSON.stringify(k);
  } catch {
    return String(k);
  }
}

function isString(v) {
  return typeof v === "string";
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

module.exports = { validateMapping };
