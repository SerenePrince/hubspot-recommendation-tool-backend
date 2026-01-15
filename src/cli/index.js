const { analyzeUrl } = require("../core/analyzer");
const { formatPrettyReport } = require("./formatPretty");

function printUsage() {
  console.log("Usage:");
  console.log("  npm run cli -- <url> [--json|--pretty-json|--all-evidence]");
  console.log("Examples:");
  console.log("  npm run cli -- https://react.dev/");
  console.log("  npm run cli -- https://react.dev/ --json");
  console.log("  npm run cli -- https://react.dev/ --pretty-json");
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

(async () => {
  const url = process.argv[2];
  const wantJson = hasFlag("--json");
  const wantPrettyJson = hasFlag("--pretty-json");
  const allEvidence = hasFlag("--all-evidence");

  if (!url || url.startsWith("--")) {
    printUsage();
    process.exit(1);
  }

  try {
    const report = await analyzeUrl(url);

    if (wantJson) {
      process.stdout.write(JSON.stringify(report));
      return;
    }

    if (wantPrettyJson) {
      process.stdout.write(JSON.stringify(report, null, 2));
      return;
    }

    // Default: human-friendly report
    process.stdout.write(formatPrettyReport(report, { allEvidence }));
  } catch (err) {
    console.error("ERROR:", err.message);
    process.exit(1);
  }
})();
