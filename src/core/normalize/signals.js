// backend/src/core/normalize/signals.js
const cheerio = require("cheerio");
const { URL } = require("node:url");

/**
 * Phase 3 (report): Signal Normalization
 *
 * Transform raw fetch artifacts into searchable, standardized signals.
 *
 * Signals produced (aligned with report):
 * - meta tags
 * - cookies (names only)
 * - scriptSrc URLs
 * - CSS references (hrefs) + CSS text (inline + fetched, bounded)
 * - DOM structure (cheerio root function)
 * - complete HTML (bounded)
 * - headers
 * - visible text
 * - URL parameters
 *
 * Additional internal signal used by matchers:
 * - scripts (inline + fetched, bounded)
 */
function buildSignals(fetchResult, options = {}) {
  const {
    // Caps are important because later phases do regex/substring matching.
    maxHtmlChars = 1_500_000,
    maxTextChars = 500_000,
    maxScriptsChars = 600_000,
    maxCssChars = 400_000,
    maxUrlParamPairs = 100,
  } = options;

  const htmlRaw = typeof fetchResult?.html === "string" ? fetchResult.html : "";
  const html = capText(htmlRaw, maxHtmlChars);

  const finalUrlRaw = fetchResult?.finalUrl || fetchResult?.requestedUrl || "";
  const url = normalizeUrl(finalUrlRaw);

  // Headers are expected to be normalized to lowercase keys by fetchPage.
  const headers = (fetchResult && fetchResult.headers) || {};

  // Cookies: keep names only (safe and sufficient for pattern matching).
  const setCookie = headers["set-cookie"];
  const cookies = parseSetCookie(setCookie);

  // Parse HTML with cheerio (lightweight DOM representation).
  // This supports CSS selector queries + attribute/text checks used by the DOM matcher.
  let $ = null;
  try {
    // decodeEntities: true keeps text extraction more consistent
    $ = cheerio.load(html, { decodeEntities: true });
  } catch {
    $ = null;
  }

  const meta = $ ? extractMeta($) : {};
  const scriptSrcRel = $ ? extractScriptSrc($) : [];
  const cssRel = $ ? extractCssRefs($) : [];
  const inlineCss = $ ? extractInlineCss($) : "";
  const inlineScripts = $ ? extractInlineScripts($) : "";

  const scriptSrc = resolveToAbsolute(scriptSrcRel, url);
  const cssHrefs = resolveToAbsolute(cssRel, url);

  // Best-effort fetched resources from Phase 2 (bounded).
  const externalScripts = Array.isArray(fetchResult?.external?.scripts) ? fetchResult.external.scripts : [];
  const externalStylesheets = Array.isArray(fetchResult?.external?.stylesheets) ? fetchResult.external.stylesheets : [];

  const fetchedScriptsText = capText(
    externalScripts.map((r) => (r && typeof r.body === "string" ? r.body : "")).join("\n\n"),
    maxScriptsChars,
  );

  const fetchedCssText = capText(
    externalStylesheets.map((r) => (r && typeof r.body === "string" ? r.body : "")).join("\n\n"),
    maxCssChars,
  );

  const scripts = capText([inlineScripts, fetchedScriptsText].filter(Boolean).join("\n\n"), maxScriptsChars);

  const css = {
    hrefs: cssHrefs,
    inline: capText([inlineCss, fetchedCssText].filter(Boolean).join("\n\n"), maxCssChars),
  };

  const text = extractVisibleText($, html, maxTextChars);

  // URL parameters: stable key/value pairs
  const urlParams = extractUrlParams(url, maxUrlParamPairs);

  // DOM signal: cheerio root function ($) used by DOM matcher.
  const dom = $;

  return {
    url,
    urlParams,
    headers,
    cookies,
    meta,
    scriptSrc,
    scripts,
    css,
    text,
    html,
    dom,
  };
}

function capText(s, maxChars) {
  const t = typeof s === "string" ? s : "";
  return t.length > maxChars ? t.slice(0, maxChars) : t;
}

function normalizeUrl(raw) {
  if (!raw || typeof raw !== "string") return "";
  try {
    const u = new URL(raw.trim());
    // Lowercase scheme + host for stable matching.
    u.protocol = u.protocol.toLowerCase();
    u.hostname = u.hostname.toLowerCase();
    return u.toString();
  } catch {
    return raw.trim();
  }
}

function resolveToAbsolute(urls, baseUrl) {
  const out = [];
  const seen = new Set();

  for (const u of urls || []) {
    const s = String(u || "").trim();
    if (!s) continue;
    if (/^(data|javascript|mailto):/i.test(s)) continue;

    try {
      const abs = new URL(s, baseUrl).toString();
      const normalized = normalizeUrl(abs);
      if (!seen.has(normalized)) {
        seen.add(normalized);
        out.push(normalized);
      }
    } catch {
      // ignore invalid URL fragments
    }
  }

  return out;
}

function extractUrlParams(url, maxPairs) {
  if (!url) return [];
  try {
    const u = new URL(url);
    const pairs = [];
    for (const [k, v] of u.searchParams.entries()) {
      pairs.push({ key: k, value: v });
      if (pairs.length >= maxPairs) break;
    }
    return pairs;
  } catch {
    return [];
  }
}

function parseSetCookie(setCookieHeader) {
  if (!setCookieHeader) return [];
  if (Array.isArray(setCookieHeader)) {
    return setCookieHeader.map(getCookieName).filter(Boolean);
  }
  const name = getCookieName(setCookieHeader);
  return name ? [name] : [];
}

function getCookieName(cookieLine) {
  if (!cookieLine || typeof cookieLine !== "string") return null;
  const firstPart = cookieLine.split(";")[0];
  const idx = firstPart.indexOf("=");
  if (idx === -1) return null;
  return firstPart.slice(0, idx).trim();
}

function extractMeta($) {
  const meta = {};

  $("meta").each((_, el) => {
    const name = $(el).attr("name");
    const property = $(el).attr("property");
    const httpEquiv = $(el).attr("http-equiv");
    const key = (name || property || httpEquiv || "").trim().toLowerCase();
    const content = ($(el).attr("content") || "").trim();

    if (key && content) meta[key] = content;
  });

  return meta;
}

function extractScriptSrc($) {
  const srcs = [];
  $("script[src]").each((_, el) => {
    const src = ($(el).attr("src") || "").trim();
    if (src) srcs.push(src);
  });
  return srcs;
}

function extractCssRefs($) {
  const hrefs = [];
  $("link").each((_, el) => {
    const rel = String($(el).attr("rel") || "").toLowerCase();
    if (!rel) return;
    if (!rel.split(/\s+/).includes("stylesheet")) return;

    const href = ($(el).attr("href") || "").trim();
    if (href) hrefs.push(href);
  });
  return hrefs;
}

function extractInlineScripts($, maxChars = 300_000) {
  let combined = "";

  $("script").each((_, el) => {
    const src = $(el).attr("src");
    if (src) return; // skip external scripts

    const text = $(el).text() || "";
    if (!text.trim()) return;

    combined += "\n" + text;

    if (combined.length > maxChars) {
      combined = combined.slice(0, maxChars);
      return false; // stop iterating
    }
  });

  return combined;
}

function extractInlineCss($, maxInlineChars = 200_000) {
  let inlineCss = "";

  $("style").each((_, el) => {
    const text = $(el).text() || "";
    if (!text.trim()) return;

    inlineCss += "\n" + text;

    if (inlineCss.length > maxInlineChars) {
      inlineCss = inlineCss.slice(0, maxInlineChars);
      return false;
    }
  });

  return inlineCss;
}

function extractVisibleText($, html, maxTextChars) {
  // Prefer DOM-stripped visible-ish text; fallback to raw HTML.
  try {
    if ($) {
      const bodyText = $("body").text() || "";
      const t = bodyText.replace(/\s+/g, " ").trim();
      return t.length > maxTextChars ? t.slice(0, maxTextChars) : t;
    }
  } catch {
    // ignore
  }

  const raw = typeof html === "string" ? html : "";
  const t = raw.replace(/\s+/g, " ").trim();
  return t.length > maxTextChars ? t.slice(0, maxTextChars) : t;
}

module.exports = { buildSignals };
