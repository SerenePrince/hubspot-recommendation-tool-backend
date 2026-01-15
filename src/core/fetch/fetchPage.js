// backend/src/core/fetch/fetchPage.js
const { URL } = require("url");
const { assertPublicHost } = require("./ssrf");
const { config } = require("../config");

/**
 * Simple, safe single-page fetch.
 * - http/https only
 * - redirect cap
 * - timeout
 * - max response size cap
 *
 * Note: SSRF private-IP blocking will be added in the next step (2B)
 * because it requires DNS lookup and IP range checks.
 */
async function fetchPage(inputUrl, options = {}) {
  const {
    timeoutMs = config.fetch.timeoutMs,
    maxBytes = config.fetch.maxBytes,
    userAgent = "HubSpot-Recommendation-Tool/0.1 (+internal tech detector)",
  } = options;

  // Validate URL scheme
  let urlObj;
  try {
    urlObj = new URL(inputUrl);
  } catch {
    throw new Error("Invalid URL");
  }

  if (!["http:", "https:"].includes(urlObj.protocol)) {
    throw new Error("Only http/https URLs are allowed");
  }

  await assertPublicHost(urlObj.hostname);

  const start = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(urlObj.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": userAgent,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error(`Fetch timed out after ${timeoutMs}ms`);
    }
    throw new Error(`Fetch failed: ${err.message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  // Redirect cap handling:
  // Node fetch follows redirects automatically; we can still detect "too many"
  // by checking response.url chain isn't directly accessible here.
  // For MVP, we rely on fetch's internal redirect limit (20) and add our own later if needed.

  // Collect headers into plain object
  const headers = {};
  for (const [k, v] of res.headers.entries()) {
    const key = k.toLowerCase();
    if (key === "set-cookie") {
      // Collect multiple set-cookie headers
      if (!headers[key]) headers[key] = [];
      headers[key].push(v);
    } else {
      headers[key] = v;
    }
  }

  const contentType = headers["content-type"] || "";

  // Stream and cap the size
  const reader = res.body?.getReader?.();
  if (!reader) {
    throw new Error("Response body is not readable");
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
      } catch {}
      throw new Error(`Response exceeded max size of ${maxBytes} bytes`);
    }
    chunks.push(value);
  }

  const buf = Buffer.concat(chunks);
  const html = buf.toString("utf8");

  const end = Date.now();

  return {
    ok: true,
    requestedUrl: inputUrl,
    finalUrl: res.url,
    status: res.status,
    statusText: res.statusText,
    headers,
    contentType,
    bytes: buf.length,
    timingMs: end - start,
    html,
  };
}

module.exports = { fetchPage };
