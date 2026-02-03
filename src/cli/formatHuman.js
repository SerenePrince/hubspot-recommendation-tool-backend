// backend/src/cli/formatHuman.js
//
// Human-readable CLI formatter intended for non-technical readers.
// Produces a compact terminal report with sections + tables.
//
// Input: the "clean" report shape produced by buildCleanReport/buildSimpleReport.
// (It will also tolerate the raw internal report, best-effort.)

function formatHuman(report) {
  const r = report && typeof report === "object" ? report : {};

  // Support both clean-report (`technologies`) and raw (`detections`) shapes.
  const technologies = Array.isArray(r.technologies)
    ? r.technologies
    : Array.isArray(r.detections)
      ? r.detections
      : [];

  const recommendations = Array.isArray(r.recommendations) ? r.recommendations : [];
  const summary = r.summary && typeof r.summary === "object" ? r.summary : null;

  // Best-effort map: detected technology -> recommended HubSpot product(s).
  // We derive this from the clean report's `recommendations[].triggeredBy` so the
  // CLI output reflects the same recommendation logic as the API.
  const techToHubSpotProducts = buildTechToHubSpotProductsMap(recommendations);

  const lines = [];

  lines.push(boxTitle("HubSpot Recommendation Tool - Analysis"));
  lines.push("");

  const url = r.url || r.requestedUrl || null;
  const finalUrl = r.finalUrl || null;

  if (url) lines.push(kvLine("URL", url));
  if (finalUrl && finalUrl !== url) lines.push(kvLine("Final URL", finalUrl));

  // Optional meta/timings in clean report: r.meta.fetch / r.meta.timings
  if (r.meta && typeof r.meta === "object") {
    const fetch = r.meta.fetch || null;
    const timings = r.meta.timings || null;

    if (fetch && typeof fetch === "object") {
      lines.push(kvLine("HTTP Status", fetch.status != null ? String(fetch.status) : "n/a"));
      if (fetch.contentType) lines.push(kvLine("Content Type", String(fetch.contentType)));
      if (fetch.bytes != null) lines.push(kvLine("Bytes", String(fetch.bytes)));
      if (fetch.timingMs != null) lines.push(kvLine("Fetch Time", `${fetch.timingMs} ms`));
    }

    if (timings && typeof timings === "object") {
      if (timings.analysisMs != null) lines.push(kvLine("Analysis Time", `${timings.analysisMs} ms`));
      if (timings.totalMs != null) lines.push(kvLine("Total Time", `${timings.totalMs} ms`));
    }
  }

  lines.push("");

  // Summary block (best-effort)
  if (summary && typeof summary === "object") {
    lines.push(section("Summary"));
    const totals = summary.totals && typeof summary.totals === "object" ? summary.totals : {};
    lines.push(kvLine("Technologies detected", String(totals.detections ?? technologies.length)));
    lines.push(kvLine("Groups", String(totals.groups ?? "n/a")));
    lines.push(kvLine("Categories", String(totals.categories ?? "n/a")));
    lines.push("");
  }

  // Technologies table
  lines.push(section(`Technologies (${technologies.length})`));
  if (!technologies.length) {
    lines.push("No technologies detected above the confidence threshold.");
    lines.push("");
  } else {
    const rows = technologies.slice(0, 200).map((t) => {
      const name = String(t?.name || t?.slug || "").trim() || "Unknown";
      const confidence = t?.confidence != null ? String(t.confidence) : "n/a";
      const version = t?.version ? String(t.version) : "";
      const cats = (Array.isArray(t?.categories) ? t.categories : [])
        .map((c) => c && c.name)
        .filter(Boolean)
        .slice(0, 3)
        .join(", ");
      const groups = (Array.isArray(t?.groups) ? t.groups : [])
        .map((g) => g && g.name)
        .filter(Boolean)
        .slice(0, 3)
        .join(", ");

      // Show HubSpot product replacement(s) for the detected technology.
      const replacement = formatProductsForTech(techToHubSpotProducts, name, t?.slug);

      return [name, confidence, version, replacement, cats, groups];
    });

    lines.push(
      table(["Technology", "Conf", "Version", "HubSpot Replacement", "Categories", "Groups"], rows, {
        maxWidth: 110,
      })
    );

    if (technologies.length > 200) {
      lines.push("");
      lines.push(`(Showing first 200 technologies. Total: ${technologies.length})`);
    }
    lines.push("");
  }

  // Recommendations
  lines.push(section(`Recommendations (${recommendations.length})`));
  if (!recommendations.length) {
    lines.push("No HubSpot recommendations were triggered.");
    lines.push("");
  } else {
    const recRows = recommendations.slice(0, 100).map((rec) => {
      const title = String(rec?.title || "").trim() || "Untitled";
      const product = String(rec?.hubspotProduct || "").trim() || "HubSpot";
      const priority = String(rec?.priority || "").trim() || "medium";
      const reason = String(rec?.reason || rec?.description || "").trim();
      return [priority, product, title, reason];
    });

    lines.push(
      table(["Priority", "Product", "Recommendation", "Reason"], recRows, {
        maxWidth: 110,
      })
    );

    if (recommendations.length > 100) {
      lines.push("");
      lines.push(`(Showing first 100 recommendations. Total: ${recommendations.length})`);
    }
    lines.push("");
  }

  lines.push(dim("Tip: use --format json (default) to get machine-readable output."));

  return lines.join("\n");
}

function boxTitle(title) {
  const t = String(title || "").trim();
  const width = Math.min(110, Math.max(40, t.length + 6));
  const inner = width - 2;
  const padLeft = Math.floor((inner - t.length) / 2);
  const padRight = inner - t.length - padLeft;
  return [
    "┌" + "─".repeat(inner) + "┐",
    "│" + " ".repeat(padLeft) + t + " ".repeat(padRight) + "│",
    "└" + "─".repeat(inner) + "┘",
  ].join("\n");
}

function section(name) {
  return `== ${String(name || "").trim()} ==`;
}

function kvLine(k, v) {
  const key = String(k || "").trim();
  const val = String(v ?? "").trim();
  return `${key}: ${val}`;
}

function dim(s) {
  // Placeholder for styling later (ANSI). Keep output plain for max compatibility.
  return String(s || "");
}

function buildTechToHubSpotProductsMap(recommendations) {
  const map = new Map();

  for (const rec of recommendations || []) {
    const product = String(rec?.hubspotProduct || "").trim();
    if (!product) continue;

    const triggers = Array.isArray(rec?.triggeredBy) ? rec.triggeredBy : [];
    for (const t of triggers) {
      if (t?.triggerType !== "technology") continue;
      const tech = String(t?.key || t?.matched || "").trim();
      if (!tech) continue;
      if (!map.has(tech)) map.set(tech, new Set());
      map.get(tech).add(product);
    }
  }

  return map;
}

function formatProductsForTech(map, techName, techSlug) {
  const keys = [String(techName || "").trim(), String(techSlug || "").trim()].filter(Boolean);
  const products = new Set();

  for (const k of keys) {
    const set = map.get(k);
    if (!set) continue;
    for (const p of set) products.add(p);
  }

  const arr = Array.from(products);
  if (!arr.length) return "";

  // Keep the cell compact; the table renderer will also truncate if needed.
  const shown = arr.slice(0, 2);
  return arr.length <= 2 ? shown.join(", ") : `${shown.join(", ")} +${arr.length - 2}`;
}

/**
 * Render a simple ASCII table with optional max width.
 * - Truncates cells with an ellipsis when needed.
 * - Wrap is intentionally avoided to keep the table readable.
 */
function table(headers, rows, options = {}) {
  const maxWidth = Number.isFinite(options.maxWidth) ? options.maxWidth : 110;

  const cols = headers.length;
  const all = [headers, ...rows].map((r) => r.map((c) => String(c ?? "")));

  const widths = new Array(cols).fill(0);
  for (const r of all) {
    for (let i = 0; i < cols; i++) {
      widths[i] = Math.max(widths[i], r[i].length);
    }
  }

  // If table exceeds maxWidth, shrink the last columns first.
  const padding = 3 * cols + 1; // pipes + spaces
  const total = widths.reduce((a, b) => a + b, 0) + padding;
  if (total > maxWidth) {
    let over = total - maxWidth;

    // Prefer shrinking long descriptive columns (right-most).
    const shrinkOrder = [...Array(cols).keys()].reverse();

    for (const idx of shrinkOrder) {
      if (over <= 0) break;
      const min = idx <= 1 ? 4 : 10; // don't crush first columns too much
      const can = Math.max(0, widths[idx] - min);
      const take = Math.min(can, over);
      widths[idx] -= take;
      over -= take;
    }
  }

  const sep = "+" + widths.map((w) => "-".repeat(w + 2)).join("+") + "+";
  const renderRow = (r) =>
    "|" +
    r
      .map((cell, i) => {
        const v = truncate(cell, widths[i]);
        return " " + v.padEnd(widths[i], " ") + " ";
      })
      .join("|") +
    "|";

  const out = [];
  out.push(sep);
  out.push(renderRow(headers.map(String)));
  out.push(sep);
  for (const r of rows) out.push(renderRow(r.map((c) => String(c ?? ""))));
  out.push(sep);
  return out.join("\n");
}

function truncate(s, maxLen) {
  const str = String(s ?? "");
  if (str.length <= maxLen) return str;
  if (maxLen <= 2) return "…";
  return str.slice(0, Math.max(0, maxLen - 1)) + "…";
}

module.exports = { formatHuman };
