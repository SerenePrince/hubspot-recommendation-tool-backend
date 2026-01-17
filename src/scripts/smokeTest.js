// backend/src/scripts/smokeTest.js
const fs = require("fs");
const path = require("path");

const { config } = require("../core/config");
const { loadTechDb } = require("../core/techdb/loadTechDb");
const { validateMapping } = require("../core/report/mappingValidator");
const {
  validateNextActionsConfig,
} = require("../core/report/nextActionsValidator");
const { analyzeUrl } = require("../core/analyzer");

function readJson(p) {
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw);
}

function mappingPath() {
  return path.resolve(
    process.cwd(),
    "./data/alternatives/hubspot-mapping.json",
  );
}

function nextActionsPath() {
  return path.resolve(
    process.cwd(),
    "./data/alternatives/inbox-next-actions.json",
  );
}

async function main() {
  console.log("== Smoke Test ==");
  console.log("NODE_ENV:", config.env);
  console.log("DATA_ROOT:", config.dataRoot);

  // 1) Load tech DB
  console.log("\n[1/4] Loading tech DB...");
  const db = await loadTechDb();
  console.log(
    `Loaded tech DB: tech=${db.meta.techCount} categories=${db.meta.categoryCount} groups=${db.meta.groupCount} files=${db.meta.technologyFilesLoaded}`,
  );

  // 2) Validate recommendation mapping
  console.log("\n[2/4] Validating recommendation mapping...");
  const mp = mappingPath();
  const mapping = readJson(mp);
  const mv = validateMapping(mapping);
  if (!mv.ok) {
    console.error("Mapping INVALID:", mp);
    for (const e of mv.errors.slice(0, 50)) console.error(" -", e);
    process.exit(2);
  }
  console.log("Mapping OK:", mp);

  // 3) Validate next actions config
  console.log("\n[3/4] Validating next actions config...");
  const np = nextActionsPath();
  const nac = readJson(np);
  const nv = validateNextActionsConfig(nac);
  if (!nv.ok) {
    console.error("Next actions config INVALID:", np);
    for (const e of nv.errors.slice(0, 50)) console.error(" -", e);
    process.exit(3);
  }
  console.log("Next actions config OK:", np);

  // 4) Optional analyze
  const url = process.argv[2];
  if (url) {
    console.log("\n[4/4] Running analyze:", url);
    const report = await analyzeUrl(url);
    console.log(
      `Analyze OK: status=${report.fetch?.status} detections=${report.detections?.length} recommendations=${report.recommendations?.length} nextActions=${report.nextActions?.length}`,
    );
  } else {
    console.log("\n[4/4] Analyze skipped (no URL provided)");
    console.log("Tip: npm run smoke -- https://react.dev/");
  }

  console.log("\n✅ Smoke test passed");
}

main().catch((err) => {
  console.error("\n❌ Smoke test failed:", err.message || err);
  process.exit(1);
});
