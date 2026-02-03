#!/usr/bin/env node
// backend/src/scripts/validateConfig.js

const fs = require("node:fs/promises");
const path = require("node:path");
const { config } = require("../core/config");

async function main() {
  const errors = [];
  const warnings = [];

  // Basic env sanity
  if (!Number.isFinite(config.port) || config.port <= 0 || config.port > 65535) {
    errors.push(`PORT must be a valid TCP port (got: ${config.port})`);
  }

  if (!Number.isFinite(config.fetch.timeoutMs) || config.fetch.timeoutMs <= 0) {
    errors.push(`FETCH_TIMEOUT_MS must be a positive integer (got: ${config.fetch.timeoutMs})`);
  }

  if (!Number.isFinite(config.fetch.maxBytes) || config.fetch.maxBytes <= 0) {
    errors.push(`MAX_FETCH_BYTES must be a positive integer (got: ${config.fetch.maxBytes})`);
  }

  // DATA_ROOT validation
  const root = config.dataRoot;
  if (!root || typeof root !== "string") {
    errors.push("DATA_ROOT is missing or invalid.");
  } else {
    await validateDataRoot(root, errors, warnings);
  }

  // Output
  if (warnings.length) {
    console.warn("⚠️  Config warnings:");
    for (const w of warnings) console.warn(" -", w);
  }

  if (errors.length) {
    console.error("❌ Config validation failed:");
    for (const e of errors) console.error(" -", e);
    process.exit(1);
  }

  console.log("✅ Config validation passed.");
  process.exit(0);
}

async function validateDataRoot(root, errors, warnings) {
  // Root must exist
  const exists = await pathExists(root);
  if (!exists) {
    errors.push(`DATA_ROOT does not exist: ${root}`);
    return;
  }

  // Required taxonomy files
  const categoriesPath = path.join(root, "categories.json");
  const groupsPath = path.join(root, "groups.json");
  if (!(await pathExists(categoriesPath))) errors.push(`Missing file: ${categoriesPath}`);
  if (!(await pathExists(groupsPath))) errors.push(`Missing file: ${groupsPath}`);

  // Technologies directory + expected files
  const techDir = path.join(root, "technologies");
  if (!(await pathExists(techDir))) {
    errors.push(`Missing directory: ${techDir}`);
    return;
  }

  const expected = technologyFiles(); // includes _.json + a..z
  const missing = [];
  for (const f of expected) {
    const p = path.join(techDir, f);
    if (!(await pathExists(p))) missing.push(f);
  }
  if (missing.length) {
    errors.push(`Missing technology JSON files in ${techDir}: ${missing.join(", ")}`);
  }

  // Quick parse sanity (not exhaustive): ensure categories/groups are JSON
  await tryParseJson(categoriesPath, errors);
  await tryParseJson(groupsPath, errors);

  // Warn if tech dir contains unexpected JSON names (not an error — datasets evolve)
  const extra = await findExtraTechFiles(techDir, expected);
  if (extra.length) {
    warnings.push(
      `Technologies directory contains extra JSON files not in the explicit load list: ${extra.join(
        ", ",
      )}. This is OK, but they will NOT be loaded unless loadTechDb is updated.`,
    );
  }
}

function technologyFiles() {
  const out = ["_.json"];
  for (let i = 0; i < 26; i++) out.push(String.fromCharCode("a".charCodeAt(0) + i) + ".json");
  return out;
}

async function findExtraTechFiles(dir, expected) {
  const exp = new Set(expected);
  let entries = [];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }
  return entries
    .filter((n) => n.endsWith(".json"))
    .filter((n) => !exp.has(n))
    .sort((a, b) => a.localeCompare(b));
}

async function tryParseJson(filePath, errors) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    JSON.parse(raw);
  } catch (e) {
    errors.push(`Invalid JSON: ${filePath} (${e?.message || String(e)})`);
  }
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

main().catch((err) => {
  console.error("❌ validateConfig crashed:", err?.message || err);
  process.exit(1);
});
