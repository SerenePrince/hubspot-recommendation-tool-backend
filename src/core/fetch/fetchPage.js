// backend/src/core/fetch/fetchPage.js
const { URL } = require("node:url");
const { assertPublicHost } = require("./ssrf");
const { config } = require("../config");
const { AppError } = require("../errors");

/**
 * Read a response body with a hard cap.
 * Uses Web Streams reader (Node's fetch/undici) to abort early.
 */
async function readBodyWithLimit(res, { maxBytes, controller }) {
  const reader = res.body?.getReader?.();
  if (!reader) {
    throw new AppError({
      code: "FETCH_UNREADABLE_BODY",
      message: "Response body is not readable",
      statusCode: 502,
      expose: true,
    });
  }

  let received = 0;
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    received += value.length;
    if (received > maxBytes) {
      try {
        controller.abort();
      } catch {
        // ignore
      }
      throw new AppError({
        code: "FETCH_TOO_LARGE",
        message: `Response exceeded max size of ${maxBytes} bytes`,
        statusCode: 413,
        expose: true,
      });
    }

    chunks.push(value);
  }

  return Buffer.concat(chunks);
}

function uniq(arr) {
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const v = String(x || "").trim();
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function extractExternalResources(html) {
  const scripts = [];
  const styles = [];

  // <script src="...">
  const scriptRe = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = scriptRe.exec(html))) scripts.push(m[1]);

  // <link rel="stylesheet" href="...">
  const linkRe = /<link\b[^>]*\brel\s*=\s*["']\s*stylesheet\s*["'][^>]*>/gi;
  while ((m = linkRe.exec(html))) {
    const tag = m[0];
    const hrefM = /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag);
    if (hrefM) styles.push(hrefM[1]);
  }

  // Some sites use rel='Stylesheet' or additional rel tokens
  const linkRe2 =
    /<link\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*\brel\s*=\s*["']([^"']+)["'][^>]*>/gi;
  while ((m = linkRe2.exec(html))) {
    const href = m[1];
    const rel = (m[2] || "").toLowerCase();
    if (rel.split(/\s+/).includes("stylesheet")) styles.push(href);
  }

  return { scripts: uniq(scripts), styles: uniq(styles) };
}

function resolveUrls(urls, baseUrl) {
  const out = [];
  for (const u of urls) {
    const s = String(u || "").trim();
    if (!s) continue;

    // Skip obvious non-fetchable schemes
    if (/^(data|javascript|mailto):/i.test(s)) continue;

    try {
      const abs = new URL(s, baseUrl).toString();
      out.push(abs);
    } catch {
      // ignore invalid
    }
  }
  return uniq(out);
}

/**
 * Fetch a single resource with SSRF checks per hop and a deadline.
 * Returns { finalUrl, status, statusText, headers, contentType, bytes, body }
 */
async function fetchResource(resourceUrl, { deadlineMs, accept, userAgent, maxBytes, maxRedirects }) {
  let currentUrl = resourceUrl;

  for (let redirects = 0; redirects <= maxRedirects; redirects++) {
    const remainingMs = deadlineMs - Date.now();
    if (remainingMs <= 0) {
      throw new AppError({
        code: "FETCH_TIMEOUT",
        message: "Fetch timed out",
        statusCode: 504,
        expose: true,
      });
    }

    let urlObj;
    try {
      urlObj = new URL(currentUrl);
    } catch (err) {
      throw new AppError({
        code: "FETCH_INVALID_URL",
        message: "Invalid URL",
        statusCode: 400,
        expose: true,
        cause: err,
      });
    }

    if (!["http:", "https:"].includes(urlObj.protocol)) {
      throw new AppError({
        code: "FETCH_UNSUPPORTED_PROTOCOL",
        message: "Only http:// and https:// URLs are supported",
        statusCode: 400,
        expose: true,
      });
    }

    // SSRF: validate host for every hop
    await assertPublicHost(urlObj.hostname);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), remainingMs);

    let res;
    try {
      res = await fetch(urlObj.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": userAgent,
          Accept: accept,
        },
      });
    } catch (err) {
      if (err?.name === "AbortError") {
        throw new AppError({
          code: "FETCH_TIMEOUT",
          message: "Fetch timed out",
          statusCode: 504,
          expose: true,
          cause: err,
        });
      }

      throw new AppError({
        code: "FETCH_FAILED",
        message: "Fetch failed",
        statusCode: 502,
        expose: true,
        cause: err,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // Manual redirect handling so we can SSRF-check each hop.
    if ([301, 302, 303, 307, 308].includes(res.status) && res.headers.get("location")) {
      if (redirects === maxRedirects) {
        throw new AppError({
          code: "FETCH_TOO_MANY_REDIRECTS",
          message: `Too many redirects (max ${maxRedirects})`,
          statusCode: 502,
          expose: true,
        });
      }

      const next = new URL(res.headers.get("location"), urlObj);

      if (!["http:", "https:"].includes(next.protocol)) {
        throw new AppError({
          code: "FETCH_REDIRECT_UNSUPPORTED_PROTOCOL",
          message: "Redirected to non-http(s) URL",
          statusCode: 502,
          expose: true,
        });
      }

      currentUrl = next.toString();
      continue;
    }

    const headers = {};
    for (const [k, v] of res.headers.entries()) headers[k.toLowerCase()] = v;

    // Preserve all Set-Cookie headers when available (Node/undici extension)
    if (typeof res.headers.getSetCookie === "function") {
      headers["set-cookie"] = res.headers.getSetCookie();
    }

    const buf = await readBodyWithLimit(res, { maxBytes, controller });

    return {
      finalUrl: currentUrl,
      status: res.status,
      statusText: res.statusText,
      headers,
      contentType: headers["content-type"] || "",
      bytes: buf.length,
      body: buf.toString("utf8"),
    };
  }

  throw new AppError({
    code: "FETCH_FAILED",
    message: "Fetch failed",
    statusCode: 502,
    expose: true,
  });
}

/**
 * Safe page fetch (Phase 2 in report):
 * - http/https only
 * - SSRF: blocks private/loopback/link-local targets
 * - deadline-based timeout
 * - max response size cap
 * - redirect limit (enforces SSRF checks per hop)
 * - opportunistically fetches a bounded subset of external JS/CSS resources
 */
async function fetchPage(inputUrl, options = {}) {
  const {
    timeoutMs = config.fetch.timeoutMs,
    maxBytes = config.fetch.maxBytes,
    userAgent = "HubSpot-Recommendation-Tool/1.0 (+internal tech detector)",
    maxRedirects = 5,

    // External resources (bounded, best-effort)
    maxExternalScripts = 8,
    maxExternalStylesheets = 8,
    maxExternalBytesEach = 250_000,
    maxExternalBytesTotal = 800_000,
    maxExternalConcurrency = 4,
  } = options;

  const start = Date.now();
  const deadlineMs = start + timeoutMs;

  // Fetch the primary HTML document
  let page;
  try {
    page = await fetchResource(inputUrl, {
      deadlineMs,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      userAgent,
      maxBytes,
      maxRedirects,
    });
  } catch (err) {
    if (err && err.name === "AppError") throw err;
    throw new AppError({
      code: "FETCH_FAILED",
      message: "Fetch failed",
      statusCode: 502,
      expose: true,
      cause: err,
    });
  }

  const headers = page.headers || {};
  const html = page.body || "";
  const baseUrl = page.finalUrl;

  // Best-effort: fetch external scripts + stylesheets referenced by the page
  // (keeps matchers effective while bounding latency and bytes).
  const ext = extractExternalResources(html);

  const scriptUrls = resolveUrls(ext.scripts, baseUrl).slice(0, maxExternalScripts);
  const styleUrls = resolveUrls(ext.styles, baseUrl).slice(0, maxExternalStylesheets);

  const external = {
    scripts: [],
    stylesheets: [],
    skipped: {
      scripts: Math.max(0, ext.scripts.length - scriptUrls.length),
      stylesheets: Math.max(0, ext.styles.length - styleUrls.length),
    },
  };

  let externalBytesBudget = maxExternalBytesTotal;

  async function mapLimit(items, limit, fn) {
    const out = [];
    let i = 0;

    const workers = new Array(Math.min(limit, items.length)).fill(null).map(async () => {
      while (true) {
        const idx = i++;
        if (idx >= items.length) return;
        const val = await fn(items[idx]);
        if (val) out.push(val);
      }
    });

    await Promise.all(workers);
    return out;
  }

  async function fetchExternal(url, accept) {
    // If we're out of budget or time, skip
    if (externalBytesBudget <= 0) return null;
    if (Date.now() >= deadlineMs) return null;

    // Per-resource cap + global cap
    const cap = Math.min(maxExternalBytesEach, externalBytesBudget);

    try {
      const r = await fetchResource(url, {
        deadlineMs,
        accept,
        userAgent,
        maxBytes: cap,
        maxRedirects,
      });

      externalBytesBudget -= r.bytes;

      return {
        url: r.finalUrl,
        bytes: r.bytes,
        contentType: r.contentType,
        body: r.body,
      };
    } catch {
      return null;
    }
  }

  const [scriptBodies, styleBodies] = await Promise.all([
    mapLimit(scriptUrls, maxExternalConcurrency, (u) =>
      fetchExternal(u, "application/javascript,text/javascript,*/*;q=0.8"),
    ),
    mapLimit(styleUrls, maxExternalConcurrency, (u) => fetchExternal(u, "text/css,*/*;q=0.8")),
  ]);

  external.scripts = scriptBodies.filter(Boolean);
  external.stylesheets = styleBodies.filter(Boolean);

  const end = Date.now();

  return {
    ok: true,
    requestedUrl: inputUrl,
    finalUrl: baseUrl,
    status: page.status,
    statusText: page.statusText || "",
    headers,
    contentType: headers["content-type"] || page.contentType || "",
    bytes: Buffer.byteLength(html, "utf8"),
    timingMs: end - start,

    // Primary document
    html,

    // Additional artifacts used by buildSignals (Phase 3)
    external,
  };
}

module.exports = { fetchPage };
