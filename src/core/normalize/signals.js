// backend/src/core/normalize/signals.js
const cheerio = require("cheerio");
const { JSDOM } = require("jsdom");

/**
 * Extract normalized signals from fetch artifacts.
 * We keep these signals small and targeted (faster + safer than scanning huge HTML everywhere).
 */
function buildSignals(fetchResult, options = {}) {
  const {
    maxHtmlChars = 1_500_000, // cap to avoid huge memory + regex slowdowns later
    maxTextChars = 500_000,
  } = options;

  const htmlRaw = typeof fetchResult.html === "string" ? fetchResult.html : "";
  const html =
    htmlRaw.length > maxHtmlChars ? htmlRaw.slice(0, maxHtmlChars) : htmlRaw;

  const finalUrl = fetchResult.finalUrl || fetchResult.requestedUrl || "";

  // Headers are already lowercased in fetchPage.js
  const headers = fetchResult.headers || {};

  // Cookies: pull set-cookie
  // NOTE: Node fetch collapses duplicate headers; set-cookie can be tricky.
  // For MVP we support single set-cookie string if present.
  // Later we can improve by reading raw headers from undici if needed.
  const setCookie = headers["set-cookie"];
  const cookies = parseSetCookie(setCookie);

  // Parse HTML with cheerio
  const $ = cheerio.load(html);

  const meta = extractMeta($);
  const scriptSrc = extractScriptSrc($);
  const { cssHrefs, inlineCss } = extractCss($);
  const inlineScripts = extractInlineScripts($);
  const text = extractText(html, maxTextChars);
  const dom = buildDom(html);

  return {
    url: finalUrl,
    headers,
    cookies,
    meta,
    scriptSrc,
    inlineScripts,
    cssHrefs,
    inlineCss,
    text,
    html,
    dom,
  };
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

    if (key && content) {
      meta[key] = content;
    }
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

function extractText(html, maxTextChars) {
  // For MVP, keep it simple: use raw HTML as "text" input for regex matching where needed.
  // Later: we can strip tags for a more accurate text-only version.
  const t = html || "";
  return t.length > maxTextChars ? t.slice(0, maxTextChars) : t;
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

function buildDom(html) {
  try {
    const dom = new JSDOM(html);
    return dom.window.document;
  } catch {
    return null;
  }
}

function extractCss($, maxInlineChars = 200_000) {
  const cssHrefs = [];
  $("link[rel='stylesheet'], link[rel='Stylesheet']").each((_, el) => {
    const href = $(el).attr("href");
    if (href) cssHrefs.push(href);
  });

  // Inline CSS (combined + capped)
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

  return { cssHrefs, inlineCss };
}

module.exports = { buildSignals };
