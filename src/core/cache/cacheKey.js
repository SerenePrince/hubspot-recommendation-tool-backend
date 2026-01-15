// backend/src/core/cache/cacheKey.js
const { URL } = require("url");

function buildCacheKey(inputUrl) {
  try {
    const u = new URL(inputUrl);

    // Hash doesn't affect fetch result content
    u.hash = "";

    // Normalize pathname: remove duplicate slashes, keep "/" if empty
    u.pathname = u.pathname.replace(/\/{2,}/g, "/") || "/";

    // Optional: normalize trailing slash (choose one style)
    // We'll keep trailing slash for root only:
    if (u.pathname !== "/" && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }

    return u.toString();
  } catch {
    // If URL is invalid, just return as-is; fetch will error anyway
    return String(inputUrl || "");
  }
}

module.exports = { buildCacheKey };
