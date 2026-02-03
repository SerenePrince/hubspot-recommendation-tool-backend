// backend/src/core/techdb/loadTechDb.js
const fs = require("node:fs/promises");
const path = require("node:path");
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
 * NOTE: Many datasets include "_.json" for technologies beginning with
 * numbers or special characters. We load that too.
 */
async function loadTechDb(options = {}) {
  const { rootSrc = config.dataRoot } = options;

  const categoriesPath = path.join(rootSrc, "categories.json");
  const groupsPath = path.join(rootSrc, "groups.json");
  const technologiesDir = path.join(rootSrc, "technologies");

  // 1) Load taxonomy
  const [categoriesById, groupsById] = await Promise.all([
    readJson(categoriesPath),
    readJson(groupsPath),
  ]);

  // 2) Load technologies (_.json + a.json..z.json)
  const expectedFiles = technologyFiles();
  const missing = await findMissingFiles(technologiesDir, expectedFiles);
  if (missing.length) {
    throw new Error(`Tech DB is missing required files: ${missing.join(", ")}`);
  }

  // Read files with bounded concurrency to avoid too many open FDs.
  const chunks = await mapLimit(expectedFiles, 8, async (filename) => {
    const fullPath = path.join(technologiesDir, filename);
    return readJson(fullPath);
  });

  // Merge into one map keyed by technology *name* (we treat name as the "slug" for internal keys).
  const technologies = {};
  for (const techChunk of chunks) {
    for (const [techName, techDef] of Object.entries(techChunk || {})) {
      technologies[techName] = techDef;
    }
  }

  // Backward-compatible alias used by other modules
  const technologiesByName = technologies;

  // A lightweight index can be useful for future optimization; keep it deterministic.
  const index = buildIndex(technologies);

  return {
    rootSrc,
    technologies,
    technologiesByName,
    categoriesById,
    groupsById,
    index,
    meta: {
      techCount: Object.keys(technologies).length,
      categoryCount: Object.keys(categoriesById || {}).length,
      groupCount: Object.keys(groupsById || {}).length,
      technologyFilesLoaded: expectedFiles.length,
    },
  };
}

function technologyFiles() {
  // Include "_.json" first (non-alphabetic bucket), then a..z
  const out = ["_.json"];
  for (let i = 0; i < 26; i++) {
    out.push(String.fromCharCode("a".charCodeAt(0) + i) + ".json");
  }
  return out;
}

async function findMissingFiles(dir, files) {
  const missing = [];
  for (const f of files) {
    const p = path.join(dir, f);
    try {
      await fs.access(p);
    } catch {
      missing.push(f);
    }
  }
  return missing;
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  try {
    return JSON.parse(raw);
  } catch (err) {
    const msg = `Failed to parse JSON: ${filePath} (${err?.message || String(err)})`;
    const e = new Error(msg);
    e.cause = err;
    throw e;
  }
}

async function mapLimit(items, limit, fn) {
  if (!Array.isArray(items) || items.length === 0) return [];

  const out = new Array(items.length);
  let nextIndex = 0;

  const workers = new Array(Math.min(limit, items.length)).fill(null).map(async () => {
    for (;;) {
      const i = nextIndex++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });

  await Promise.all(workers);
  return out;
}

function buildIndex(technologies) {
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

  for (const [name, def] of Object.entries(technologies || {})) {
    if (!def || typeof def !== "object") continue;

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
