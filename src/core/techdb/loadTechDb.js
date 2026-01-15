// backend/src/core/techdb/loadTechDb.js
const fs = require("fs/promises");
const path = require("path");
const { config } = require("../config");

/**
 * Load WebAppAnalyzer (Wappalyzer-style) tech DB from a local clone.
 *
 * Expected structure:
 *   <rootSrc>/
 *     categories.json
 *     groups.json
 *     technologies/
 *       _.json
 *       a.json
 *       ...
 *       z.json
 *
 * rootSrc example (from repo root):
 *   data/vendor/webappanalyzer/src
 */
async function loadTechDb(options = {}) {
  const { rootSrc = config.dataRoot } = options;

  const categoriesPath = path.join(rootSrc, "categories.json");
  const groupsPath = path.join(rootSrc, "groups.json");
  const technologiesDir = path.join(rootSrc, "technologies");

  // 1) Load taxonomy
  const [categoriesRaw, groupsRaw] = await Promise.all([
    readJson(categoriesPath),
    readJson(groupsPath),
  ]);

  // categories.json and groups.json are usually objects keyed by ID
  const categoriesById = categoriesRaw;
  const groupsById = groupsRaw;

  // 2) Load all technologies files
  const files = await fs.readdir(technologiesDir);

  // Only load .json files
  const jsonFiles = files.filter((f) => f.endsWith(".json"));

  // Read each file and merge into one map keyed by tech name
  const technologiesByName = {};

  for (const filename of jsonFiles) {
    const fullPath = path.join(technologiesDir, filename);
    const techChunk = await readJson(fullPath);

    // Each file is typically an object: { "TechName": { ... }, ... }
    for (const [techName, techDef] of Object.entries(techChunk)) {
      technologiesByName[techName] = techDef;
    }
  }

  const index = buildIndex(technologiesByName);

  return {
    rootSrc,
    technologiesByName,
    categoriesById,
    groupsById,
    index,
    meta: {
      techCount: Object.keys(technologiesByName).length,
      categoryCount: Object.keys(categoriesById).length,
      groupCount: Object.keys(groupsById).length,
      technologyFilesLoaded: jsonFiles.length,
    },
  };
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  try {
    return JSON.parse(raw);
  } catch (err) {
    const msg = `Failed to parse JSON: ${filePath} (${err.message})`;
    const e = new Error(msg);
    e.cause = err;
    throw e;
  }
}

function buildIndex(technologiesByName) {
  const idx = {
    headers: [],
    scriptSrc: [],
    meta: [],
    url: [],
    cookies: [],
    scripts: [],
    dom: [],
    text: [],
    html: [],
    css: [],
    implies: [],
    excludes: [],
    requires: [],
    requiresCategory: [],
  };

  for (const [name, def] of Object.entries(technologiesByName)) {
    if (def.headers) idx.headers.push(name);
    if (def.scriptSrc) idx.scriptSrc.push(name);
    if (def.meta) idx.meta.push(name);
    if (def.url) idx.url.push(name);
    if (def.cookies) idx.cookies.push(name);
    if (def.scripts) idx.scripts.push(name);
    if (def.text) idx.text.push(name);
    if (def.dom) idx.dom.push(name);
    if (def.html) idx.html.push(name);
    if (def.css) idx.css.push(name);

    if (def.implies) idx.implies.push(name);
    if (def.excludes) idx.excludes.push(name);
    if (def.requires) idx.requires.push(name);
    if (def.requiresCategory) idx.requiresCategory.push(name);
  }

  return idx;
}

module.exports = { loadTechDb };
