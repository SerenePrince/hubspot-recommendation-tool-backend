// backend/src/core/report/mappingValidator.js

const ALLOWED_PRIORITIES = new Set(["high", "medium", "low"]);

function validateMapping(mapping) {
  const errors = [];

  if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) {
    return {
      ok: false,
      errors: ["Mapping must be a JSON object at the root."],
    };
  }

  // Sections are optional, but if present must be objects
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
    errors.push(
      `${sectionName} must be an object of { key: RecommendationItem[] }.`
    );
    return;
  }

  for (const [key, arr] of Object.entries(section)) {
    if (!Array.isArray(arr)) {
      errors.push(
        `${sectionName}.${jsonKey(
          key
        )} must be an array of recommendation items.`
      );
      continue;
    }

    arr.forEach((item, idx) =>
      validateItem(item, `${sectionName}.${jsonKey(key)}[${idx}]`, errors)
    );
  }
}

function validateItem(item, path, errors) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    errors.push(`${path} must be an object.`);
    return;
  }

  // Required
  if (!isNonEmptyString(item.title))
    errors.push(`${path}.title is required (non-empty string).`);
  if (!isNonEmptyString(item.hubspotProduct))
    errors.push(`${path}.hubspotProduct is required (non-empty string).`);

  // priority required (keeps sorting consistent)
  if (
    !isNonEmptyString(item.priority) ||
    !ALLOWED_PRIORITIES.has(item.priority)
  ) {
    errors.push(`${path}.priority must be one of: high, medium, low.`);
  }

  // Optional string fields
  if (item.reason != null && typeof item.reason !== "string") {
    errors.push(`${path}.reason must be a string if provided.`);
  }
  if (item.inboxOffer != null && typeof item.inboxOffer !== "string") {
    errors.push(`${path}.inboxOffer must be a string if provided.`);
  }

  // Optional: tags array
  if (item.tags != null) {
    if (
      !Array.isArray(item.tags) ||
      item.tags.some((t) => typeof t !== "string")
    ) {
      errors.push(`${path}.tags must be an array of strings if provided.`);
    }
  }
}

function isNonEmptyString(x) {
  return typeof x === "string" && x.trim().length > 0;
}

function jsonKey(k) {
  // helps readability for weird category keys
  return JSON.stringify(k);
}

module.exports = { validateMapping };
