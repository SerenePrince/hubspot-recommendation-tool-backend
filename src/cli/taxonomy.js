#!/usr/bin/env node
// backend/src/cli/taxonomy.js

const { loadTechDb } = require("../core/techdb/loadTechDb");
const { formatPretty } = require("./formatPretty");

/**
 * CLI: dump taxonomy information (categories and groups).
 *
 * Usage:
 *   node src/cli/taxonomy.js [--pretty]
 *
 * Output:
 *   { categories: [...], groups: [...] }
 */

async function main() {
  const args = new Set(process.argv.slice(2));
  const pretty = args.has("--pretty");

  const db = await loadTechDb();

  const categories = Object.entries(db.categoriesById || {})
    .map(([id, c]) => ({
      id,
      name: c.name ?? null,
      groups: Array.isArray(c.groups) ? c.groups.map(String) : [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const groups = Object.entries(db.groupsById || {})
    .map(([id, g]) => ({
      id,
      name: g.name ?? null,
      // If vendor adds extra fields we ignore them here
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const payload = { categories, groups, meta: db.meta || null };

  process.stdout.write((pretty ? formatPretty(payload) : JSON.stringify(payload)) + "\n");
}

main().catch((err) => {
  process.stderr.write(`Error: ${err?.message || String(err)}\n`);
  process.exit(1);
});
