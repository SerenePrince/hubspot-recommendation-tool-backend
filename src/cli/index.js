#!/usr/bin/env node
// backend/src/cli/index.js

const { URL } = require("node:url");
const { analyzeUrl } = require("../core/analyzer");
const { buildCleanReport } = require("../core/report/cleanReport");
const { formatPretty } = require("./formatPretty");
const { formatHuman } = require("./formatHuman");

/**
 * CLI: analyze a URL and print the resulting report.
 *
 * Usage:
 *   node src/cli/index.js <url> [--format <json|json-pretty|human>] [--meta] [--raw]
 *
 * Flags:
 *   --format <mode>  Output format: json (default), json-pretty, human
 *   --human          Alias for --format human
 *   --pretty         Alias for --format json-pretty (back-compat)
 *   --meta           Include fetch/timing metadata (uses buildCleanReport) (default behavior)
 *   --raw            Print the full internal report (includes richer fields)
 */

async function main() {
  const args = process.argv.slice(2);

  const flags = new Set(args.filter((a) => a.startsWith("--")));
  const urlArg = args.find((a) => !a.startsWith("--"));

  if (!urlArg || urlArg === "help" || flags.has("--help") || flags.has("-h")) {
    printHelp();
    process.exit(urlArg ? 0 : 1);
  }

  const url = normalizeUrl(urlArg);

  const report = await analyzeUrl(url);

  const wantsRaw = flags.has("--raw");
  const wantsMeta = flags.has("--meta"); // kept for compatibility; default already includes meta

  // Output format selection
  const format =
    (
      getFlagValue(args, "--format") ||
      (flags.has("--human") ? "human" : null) ||
      (flags.has("--pretty") ? "json-pretty" : null) ||
      "json"
    ).toLowerCase();

  let payload;
  if (wantsRaw) {
    payload = report;
  } else if (wantsMeta) {
    payload = buildCleanReport(report);
  } else {
    payload = buildCleanReport(report); // default is meta-friendly clean format
    // If you want the absolute minimal output, switch to buildSimpleReport().
    // Keeping buildCleanReport as default matches typical CLI expectations.
  }

  const output =
    format === "human"
      ? formatHuman(payload)
      : format === "json-pretty"
        ? formatPretty(payload)
        : JSON.stringify(payload);

  process.stdout.write(output + "\n");
}

function getFlagValue(args, flagName) {
  // Support: --format human
  const idx = args.indexOf(flagName);
  if (idx !== -1 && idx + 1 < args.length) {
    const v = args[idx + 1];
    if (v && !v.startsWith("--")) return v;
  }

  // Support: --format=human
  const withEq = args.find((a) => a.startsWith(flagName + "="));
  if (withEq) return withEq.split("=", 2)[1] || null;

  return null;
}

function normalizeUrl(raw) {
  let u;
  try {
    u = new URL(String(raw).trim());
  } catch {
    throw new Error(`Invalid URL: ${raw}`);
  }

  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error(`Unsupported protocol: ${u.protocol}`);
  }

  return u.toString();
}

function printHelp() {
  const text = `
HubSpot Recommendation Tool - CLI

Usage:
  node src/cli/index.js <url> [--format <json|json-pretty|human>] [--meta] [--raw]

Flags:
  --format <mode>  Output format: json (default), json-pretty, human
  --human          Alias for --format human
  --pretty         Alias for --format json-pretty (back-compat)
  --meta           Include fetch/timing metadata (default behavior)
  --raw            Print the full internal report (debug)

Examples:
  node src/cli/index.js https://react.dev --format human
  node src/cli/index.js https://react.dev --human
  node src/cli/index.js https://react.dev --pretty
  node src/cli/index.js https://example.com --raw --format json-pretty
`;
  process.stdout.write(text.trim() + "\n");
}

main().catch((err) => {
  process.stderr.write(`Error: ${err?.message || String(err)}\n`);
  process.exit(1);
});
