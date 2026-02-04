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
 *   --format <mode>    Output format: json (default), json-pretty, human
 *   --human            Alias for --format human
 *   --pretty           Alias for --format json-pretty (back-compat)
 *   --meta             Include fetch/timing metadata (default behavior)
 *   --raw              Print the full internal report (includes richer fields)
 *
 * Human output flags (only apply to --format human):
 *   --wide             Disable column shrinking/truncation (may exceed terminal width)
 *   --wrap             Wrap long cells to fit the table width (taller output)
 *   --max-width <n>    Override the maximum table width (defaults to terminal width, capped at 120)
 *   --inspect <tech>   Show a detailed view for one detected technology (works best with --wide or --wrap)
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
  }

  // Human formatter options
  const maxWidthArg = getFlagValue(args, "--max-width");
  const inspect = getFlagValue(args, "--inspect");

  const terminalWidth =
    Number.isFinite(process.stdout.columns) && process.stdout.columns > 0
      ? process.stdout.columns
      : 110;

  const defaultMaxWidth = Math.min(120, Math.max(80, terminalWidth));

  const humanOptions = {
    mode: flags.has("--wide") ? "wide" : flags.has("--wrap") ? "wrap" : "truncate",
    maxWidth: maxWidthArg ? clampInt(maxWidthArg, 40, 400) : defaultMaxWidth,
    inspect: inspect ? String(inspect) : null,
  };

  const output =
    format === "human"
      ? formatHuman(payload, humanOptions)
      : format === "json-pretty"
        ? formatPretty(payload)
        : JSON.stringify(payload);

  process.stdout.write(output + "\n");
}

function clampInt(value, min, max) {
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function getFlagValue(args, flagName) {
  // Support: --format human / --max-width 100 / --inspect "WordPress"
  const idx = args.indexOf(flagName);
  if (idx !== -1 && idx + 1 < args.length) {
    const v = args[idx + 1];
    if (v && !v.startsWith("--")) return v;
  }

  // Support: --format=human / --max-width=100 / --inspect=WordPress
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
  --format <mode>    Output format: json (default), json-pretty, human
  --human            Alias for --format human
  --pretty           Alias for --format json-pretty (back-compat)
  --meta             Include fetch/timing metadata (default behavior)
  --raw              Print the full internal analysis report (debug)

Human output flags (only apply to --format human):
  --wide             Disable truncation (may exceed terminal width)
  --wrap             Wrap long cells to fit within table width
  --max-width <n>    Override max table width (default: terminal width, capped at 120)
  --inspect <tech>   Show a detailed view for one detected technology

Examples:
  node src/cli/index.js https://react.dev --format human
  node src/cli/index.js https://react.dev --human --wrap
  node src/cli/index.js https://react.dev --human --wide
  node src/cli/index.js https://react.dev --human --max-width 100
  node src/cli/index.js https://react.dev --human --inspect "WordPress" --wide
  node src/cli/index.js https://example.com --raw --format json-pretty
`;
  process.stdout.write(text.trim() + "\n");
}

main().catch((err) => {
  process.stderr.write(`Error: ${err?.message || String(err)}\n`);
  process.exit(1);
});
