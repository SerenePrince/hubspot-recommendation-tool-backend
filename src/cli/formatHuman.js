// backend/src/cli/formatHuman.js
//
// Human-readable CLI formatter intended for non-technical readers.
// Produces a compact terminal report with sections + tables.
//
// Input: the "clean" report shape produced by buildCleanReport/buildSimpleReport.
// (It will also tolerate the raw internal report, best-effort.)

/**
 * @param {object} report
 * @param {{ mode?: "truncate"|"wrap"|"wide", maxWidth?: number, inspect?: string|null }} [options]
 */
function formatHuman(report, options = {}) {
  const r = report && typeof report === "object" ? report : {};

  const mode = options.mode === "wide" || options.mode === "wrap" ? options.mode : "truncate";
  const maxWidth =
    Number.isFinite(options.maxWidth) && options.maxWidth > 0 ? Math.floor(options.maxWidth) : 110;

  const inspect = options.inspect ? String(options.inspect).trim() : null;

  // Support both clean-report (`technologies`) and raw (`detections`) shapes.
  const technologies = Array.isArray(r.technologies)
    ? r.technologies
    : Array.isArray(r.detections)
      ? r.detections
      : [];

  const recommendations = Array.isArray(r.recommendations) ? r.recommendations : [];
  const summary = r.summary && typeof r.summary === "object" ? r.summary : null;

  // Best-effort map: detected technology -> recommended HubSpot product(s), ordered primary-first.
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

  // Top Recommendations (client-friendly skim section)
  lines.push(section("Top Recommendations"));
  if (!recommendations.length) {
    lines.push("No HubSpot recommendations were triggered.");
  } else {
    const top = recommendations
      .slice()
      .sort((a, b) => {
        const ra = prioRank(a?.priority);
        const rb = prioRank(b?.priority);
        if (ra !== rb) return ra - rb;
        // stable-ish tie-breaker
        const pa = String(a?.hubspotProduct || "");
        const pb = String(b?.hubspotProduct || "");
        if (pa !== pb) return pa.localeCompare(pb);
        return String(a?.title || "").localeCompare(String(b?.title || ""));
      })
      .slice(0, 5);

    top.forEach((rec, idx) => {
      const product = String(rec?.hubspotProduct || "").trim() || "HubSpot";
      const priority = String(rec?.priority || "medium").trim().toLowerCase();
      const title = String(rec?.title || "").trim() || "Untitled";
      const triggered = summarizeTriggeredBy(rec?.triggeredBy, { maxItems: 2, maxLen: 90 });
      const triggerSuffix = triggered ? ` (Triggered by: ${triggered})` : "";
      lines.push(`${idx + 1}) ${product} (${priority}) — ${title}${triggerSuffix}`);
    });
  }
  lines.push("");

  // Inspect mode
  if (inspect) {
    lines.push(section(`Inspect: ${inspect}`));
    const { tech, recs } = inspectTechnology(technologies, recommendations, inspect);
    if (!tech) {
      lines.push(`No detected technology matched: ${inspect}`);
      lines.push("");
      lines.push(dim("Tip: check exact casing (technology names are case-sensitive in the dataset)."));
      return lines.join("\n");
    }

    lines.push(kvLine("Technology", String(tech.name || tech.slug || "Unknown")));
    if (tech.version) lines.push(kvLine("Version", String(tech.version)));
    if (tech.confidence != null) lines.push(kvLine("Confidence", String(tech.confidence)));

    const cats = (Array.isArray(tech.categories) ? tech.categories : [])
      .map((c) => c && c.name)
      .filter(Boolean)
      .join(", ");
    const groups = (Array.isArray(tech.groups) ? tech.groups : [])
      .map((g) => g && g.name)
      .filter(Boolean)
      .join(", ");
    if (cats) lines.push(kvLine("Categories", cats));
    if (groups) lines.push(kvLine("Groups", groups));

    const replacement = formatProductsForTech(techToHubSpotProducts, tech.name, tech.slug, {
      maxProducts: 5,
      style: "arrow",
    });
    if (replacement) lines.push(kvLine("HubSpot Replacement", replacement));

    lines.push("");

    lines.push(section(`Triggered Recommendations (${recs.length})`));
    if (!recs.length) {
      lines.push("No recommendations were triggered by this technology.");
    } else {
      const rows = recs.map((rec) => {
        const title = String(rec?.title || "").trim() || "Untitled";
        const product = String(rec?.hubspotProduct || "").trim() || "HubSpot";
        const priority = String(rec?.priority || "").trim() || "medium";
        const desc = String(rec?.description || rec?.reason || "").trim();
        const triggered = summarizeTriggeredBy(rec?.triggeredBy, { maxItems: 3, maxLen: 120 });
        return [priority, product, title, desc, triggered];
      });
      const recTable = table(
        ["Priority", "Product", "Recommendation", "Description", "Triggered by"],
        rows,
        { mode, maxWidth }
      );
      lines.push(recTable.text);
      if (recTable.truncated && mode !== "wide") {
        lines.push("");
        lines.push(
          dim("⚠ Some cells were truncated. Re-run with --wide for full values, or --wrap to avoid truncation.")
        );
      }
    }

    lines.push("");
    lines.push(dim("Tip: remove --inspect to see the full tables."));
    return lines.join("\n");
  }

  // Technologies table
  lines.push(section(`Technologies (${technologies.length})`));
  if (!technologies.length) {
    lines.push("No technologies detected above the confidence threshold.");
    lines.push("");
  } else {
    let mappedCount = 0;
    const unmappedNames = [];

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

      const replacement = formatProductsForTech(techToHubSpotProducts, name, t?.slug, {
        maxProducts: 2,
        style: "arrow",
      });

      if (replacement) mappedCount += 1;
      else if (unmappedNames.length < 8 && name !== "Unknown") unmappedNames.push(name);

      return [name, confidence, version, replacement, cats, groups];
    });

    const techTable = table(
      ["Technology", "Conf", "Version", "HubSpot Replacement (Primary → Secondary)", "Categories", "Groups"],
      rows,
      { mode, maxWidth }
    );
    lines.push(techTable.text);

    // Coverage note (clients often ask why some cells are blank)
    lines.push("");
    lines.push(
      `Mapped replacements: ${mappedCount}/${Math.min(technologies.length, 200)} technologies` +
        (technologies.length > 200 ? " (first 200 shown)" : "")
    );
    if (unmappedNames.length) {
      lines.push(`No replacement mapped for: ${unmappedNames.join(", ")}${technologies.length > 200 ? ", …" : ""}`);
    }

    if (technologies.length > 200) {
      lines.push("");
      lines.push(`(Showing first 200 technologies. Total: ${technologies.length})`);
    }
    lines.push("");

    if (techTable.truncated && mode !== "wide") {
      lines.push(
        dim("⚠ Some cells were truncated. Re-run with --wide for full values, or --wrap to avoid truncation.")
      );
      lines.push("");
    }
  }

  // Recommendations table
  lines.push(section(`Recommendations (${recommendations.length})`));
  if (!recommendations.length) {
    lines.push("No HubSpot recommendations were triggered.");
    lines.push("");
  } else {
    const recRows = recommendations.slice(0, 100).map((rec) => {
      const title = String(rec?.title || "").trim() || "Untitled";
      const product = String(rec?.hubspotProduct || "").trim() || "HubSpot";
      const priority = String(rec?.priority || "").trim() || "medium";
      const desc = String(rec?.description || rec?.reason || "").trim();
      const triggered = summarizeTriggeredBy(rec?.triggeredBy, { maxItems: 3, maxLen: 120 });
      return [priority, product, title, desc, triggered];
    });

    const recTable = table(
      ["Priority", "Product", "Recommendation", "Description", "Triggered by"],
      recRows,
      { mode, maxWidth }
    );
    lines.push(recTable.text);

    if (recommendations.length > 100) {
      lines.push("");
      lines.push(`(Showing first 100 recommendations. Total: ${recommendations.length})`);
    }
    lines.push("");

    if (recTable.truncated && mode !== "wide") {
      lines.push(
        dim("⚠ Some cells were truncated. Re-run with --wide for full values, or --wrap to avoid truncation.")
      );
      lines.push("");
    }
  }

  // Interpretation footer (helps clients)
  lines.push(dim("Notes: Technology-triggered recommendations are strongest; category-triggered recommendations are broader."));
  lines.push(dim("Primary replacement is shown first. Use --wide or --wrap to view full text."));
  lines.push(dim("Tip: use --format json (default) to get machine-readable output."));

  return lines.join("\n");
}

function inspectTechnology(technologies, recommendations, inspect) {
  const needle = String(inspect || "").trim();
  if (!needle) return { tech: null, recs: [] };

  const tech =
    (technologies || []).find((t) => String(t?.name || "").trim() === needle) ||
    (technologies || []).find((t) => String(t?.slug || "").trim() === needle) ||
    null;

  if (!tech) return { tech: null, recs: [] };

  const keyCandidates = new Set([String(tech.name || "").trim(), String(tech.slug || "").trim()]);

  const recs = (recommendations || []).filter((rec) => {
    const triggers = Array.isArray(rec?.triggeredBy) ? rec.triggeredBy : [];
    return triggers.some(
      (t) =>
        t?.triggerType === "technology" &&
        keyCandidates.has(String(t?.key || t?.matched || "").trim())
    );
  });

  return { tech, recs };
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

function prioRank(p) {
  const v = String(p || "").toLowerCase();
  if (v === "high") return 0;
  if (v === "medium") return 1;
  if (v === "low") return 2;
  return 3;
}

/**
 * Build: techKey -> product -> { bestPriorityRank, firstSeen }
 * so we can order products primary-first deterministically.
 */
function buildTechToHubSpotProductsMap(recommendations) {
  const map = new Map();

  (recommendations || []).forEach((rec, recIndex) => {
    const product = String(rec?.hubspotProduct || "").trim();
    if (!product) return;

    const rank = prioRank(rec?.priority);
    const triggers = Array.isArray(rec?.triggeredBy) ? rec.triggeredBy : [];

    for (const t of triggers) {
      if (t?.triggerType !== "technology") continue;
      const techKey = String(t?.key || t?.matched || "").trim();
      if (!techKey) continue;

      if (!map.has(techKey)) map.set(techKey, new Map());
      const productMap = map.get(techKey);

      if (!productMap.has(product)) {
        productMap.set(product, { bestPriorityRank: rank, firstSeen: recIndex });
      } else {
        const meta = productMap.get(product);
        meta.bestPriorityRank = Math.min(meta.bestPriorityRank, rank);
        meta.firstSeen = Math.min(meta.firstSeen, recIndex);
      }
    }
  });

  return map;
}

/**
 * Format product list for a tech. Primary comes first (best priority rank, then first seen).
 * @param {Map<string, Map<string, {bestPriorityRank:number, firstSeen:number}>>} map
 */
function formatProductsForTech(map, techName, techSlug, opts = {}) {
  const keys = [String(techName || "").trim(), String(techSlug || "").trim()].filter(Boolean);
  const maxProducts = Number.isFinite(opts.maxProducts) ? Math.max(1, Math.floor(opts.maxProducts)) : 2;
  const style = opts.style === "comma" ? "comma" : "arrow";

  // Aggregate product metadata across possible keys (name/slug)
  const productMeta = new Map(); // product -> { bestPriorityRank, firstSeen }

  for (const k of keys) {
    const perTech = map.get(k);
    if (!perTech) continue;

    for (const [product, meta] of perTech.entries()) {
      if (!productMeta.has(product)) {
        productMeta.set(product, { ...meta });
      } else {
        const cur = productMeta.get(product);
        cur.bestPriorityRank = Math.min(cur.bestPriorityRank, meta.bestPriorityRank);
        cur.firstSeen = Math.min(cur.firstSeen, meta.firstSeen);
      }
    }
  }

  const ordered = Array.from(productMeta.entries())
    .sort((a, b) => {
      const ma = a[1], mb = b[1];
      if (ma.bestPriorityRank !== mb.bestPriorityRank) return ma.bestPriorityRank - mb.bestPriorityRank;
      return ma.firstSeen - mb.firstSeen;
    })
    .map(([product]) => product);

  if (!ordered.length) return "";

  const shown = ordered.slice(0, maxProducts);
  const sep = style === "comma" ? ", " : " → ";
  const base = shown.join(sep);

  if (ordered.length <= maxProducts) return base;
  return `${base} +${ordered.length - maxProducts}`;
}

function summarizeTriggeredBy(triggeredBy, opts = {}) {
  const items = Array.isArray(triggeredBy) ? triggeredBy : [];
  if (!items.length) return "";

  const maxItems = Number.isFinite(opts.maxItems) ? Math.max(1, Math.floor(opts.maxItems)) : 3;
  const maxLen = Number.isFinite(opts.maxLen) ? Math.max(30, Math.floor(opts.maxLen)) : 120;

  // Prefer technology + category triggers; keep stable order as provided.
  const formatted = [];
  for (const t of items) {
    const type = String(t?.triggerType || "").trim();
    const key = String(t?.key || t?.matched || "").trim();
    if (!type || !key) continue;

    if (type === "technology") formatted.push(`Tech: ${key}`);
    else if (type === "category") formatted.push(`Category: ${key}`);
    else if (type === "group") formatted.push(`Group: ${key}`);
    else formatted.push(`${type}: ${key}`);

    if (formatted.length >= maxItems) break;
  }

  if (!formatted.length) return "";

  let s = formatted.join("; ");
  const remaining = Math.max(0, items.length - formatted.length);
  if (remaining > 0) s += `; +${remaining}`;

  if (s.length <= maxLen) return s;
  return s.slice(0, Math.max(0, maxLen - 1)).trimEnd() + "…";
}

/**
 * Render a simple ASCII table.
 *
 * Modes:
 * - truncate (default): shrink columns to fit maxWidth, truncating cells with an ellipsis when needed.
 * - wrap: shrink columns to fit maxWidth, wrapping cell content across multiple lines (no truncation).
 * - wide: do not shrink columns and do not truncate (may exceed terminal width).
 *
 * @returns {{ text: string, truncated: boolean }}
 */
function table(headers, rows, options = {}) {
  const mode = options.mode === "wide" || options.mode === "wrap" ? options.mode : "truncate";
  const maxWidth = Number.isFinite(options.maxWidth) ? options.maxWidth : 110;

  const cols = headers.length;
  const all = [headers, ...rows].map((r) => r.map((c) => String(c ?? "")));

  const widths = new Array(cols).fill(0);
  for (const r of all) {
    for (let i = 0; i < cols; i++) {
      widths[i] = Math.max(widths[i], displayWidth(r[i]));
    }
  }

  let truncated = false;

  if (mode !== "wide") {
    const padding = 3 * cols + 1; // pipes + spaces
    const total = widths.reduce((a, b) => a + b, 0) + padding;
    if (total > maxWidth) {
      let over = total - maxWidth;

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
  }

  const sep = "+" + widths.map((w) => "-".repeat(w + 2)).join("+") + "+";

  const out = [];
  out.push(sep);

  if (mode === "wrap") {
    out.push(...renderWrappedRow(headers.map(String), widths));
  } else {
    const hdr = renderTruncatedRow(headers.map(String), widths, mode === "wide");
    truncated = truncated || hdr.truncated;
    out.push(hdr.text);
  }

  out.push(sep);

  for (const row of rows) {
    if (mode === "wrap") {
      out.push(...renderWrappedRow(row.map((c) => String(c ?? "")), widths));
    } else {
      const rr = renderTruncatedRow(row.map((c) => String(c ?? "")), widths, mode === "wide");
      truncated = truncated || rr.truncated;
      out.push(rr.text);
    }
  }

  out.push(sep);

  return { text: out.join("\n"), truncated };
}

function renderTruncatedRow(cells, widths, allowOverflow) {
  let rowTruncated = false;

  const parts = cells.map((cell, i) => {
    if (allowOverflow) {
      const v = String(cell ?? "");
      const pad = Math.max(0, widths[i] - displayWidth(v));
      return " " + v + " ".repeat(pad) + " ";
    }

    const { text, didTruncate } = truncateToWidth(String(cell ?? ""), widths[i]);
    if (didTruncate) rowTruncated = true;
    return " " + text.padEnd(widths[i], " ") + " ";
  });

  return { text: "|" + parts.join("|") + "|", truncated: rowTruncated };
}

function renderWrappedRow(cells, widths) {
  const wrapped = cells.map((cell, i) => wrapToWidth(String(cell ?? ""), widths[i]));
  const height = Math.max(1, ...wrapped.map((lines) => lines.length));

  const lines = [];
  for (let lineIdx = 0; lineIdx < height; lineIdx++) {
    const parts = wrapped.map((cellLines, colIdx) => {
      const v = cellLines[lineIdx] ?? "";
      return " " + v.padEnd(widths[colIdx], " ") + " ";
    });
    lines.push("|" + parts.join("|") + "|");
  }
  return lines;
}

function truncateToWidth(str, maxW) {
  const s = String(str ?? "");
  if (displayWidth(s) <= maxW) return { text: s, didTruncate: false };
  if (maxW <= 1) return { text: "…", didTruncate: true };
  if (maxW === 2) return { text: "…", didTruncate: true };

  const target = maxW - 1; // reserve for ellipsis
  let out = "";
  for (const ch of s) {
    if (displayWidth(out + ch) > target) break;
    out += ch;
  }
  return { text: out + "…", didTruncate: true };
}

function wrapToWidth(str, maxW) {
  const s = String(str ?? "");
  if (!s) return [""];
  if (maxW <= 1) return ["…"];

  const tokens = s.split(/\s+/).filter(Boolean);
  if (!tokens.length) return [""];

  const lines = [];
  let current = "";

  const pushCurrent = () => {
    lines.push(current);
    current = "";
  };

  for (const tok of tokens) {
    if (!current) {
      if (displayWidth(tok) <= maxW) {
        current = tok;
      } else {
        lines.push(...hardWrap(tok, maxW));
      }
      continue;
    }

    const candidate = current + " " + tok;
    if (displayWidth(candidate) <= maxW) {
      current = candidate;
    } else {
      pushCurrent();
      if (displayWidth(tok) <= maxW) {
        current = tok;
      } else {
        lines.push(...hardWrap(tok, maxW));
      }
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function hardWrap(str, maxW) {
  const s = String(str ?? "");
  if (!s) return [""];
  const lines = [];
  let cur = "";
  for (const ch of s) {
    if (displayWidth(cur + ch) > maxW) {
      lines.push(cur);
      cur = ch;
    } else {
      cur += ch;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function displayWidth(str) {
  let w = 0;
  for (const _ch of String(str ?? "")) w += 1;
  return w;
}

module.exports = { formatHuman };
