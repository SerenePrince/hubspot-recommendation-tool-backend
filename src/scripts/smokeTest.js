#!/usr/bin/env node
// backend/src/scripts/smokeTest.js

const http = require("node:http");
const https = require("node:https");
const { URL } = require("node:url");

const { analyzeUrl } = require("../core/analyzer");

/**
 * Smoke test supports two modes:
 *
 * 1) Direct mode (default): calls analyzeUrl() directly (no server required).
 * 2) API mode: if SMOKE_BASE_URL is set, calls GET /health and GET /analyze.
 *
 * Usage:
 *   node src/scripts/smokeTest.js [url]
 *
 * Env:
 *   SMOKE_BASE_URL=http://localhost:3001    # optional API mode
 *   SMOKE_URL=https://example.com           # optional default URL
 *
 * DNS fallback:
 * - If the provided hostname fails DNS resolution (ENOTFOUND),
 *   retry against a known public IP over HTTP.
 */

async function main() {
  const targetUrl = getTargetUrl();

  const base = process.env.SMOKE_BASE_URL;
  if (base) {
    await smokeApi(base, targetUrl);
  } else {
    await smokeDirectWithFallback(targetUrl);
  }

  console.log("✅ Smoke test passed.");
  process.exit(0);
}

function getTargetUrl() {
  const arg = process.argv[2];
  const env = process.env.SMOKE_URL;

  // Default tries the canonical hostname first.
  const raw = arg || env || "https://react.dev/";

  let u;
  try {
    u = new URL(raw);
  } catch {
    throw new Error(`Invalid URL: ${raw}`);
  }

  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error(`Unsupported protocol: ${u.protocol}`);
  }

  return u.toString();
}

async function smokeDirectWithFallback(url) {
  console.log("Running smoke test in direct mode (analyzeUrl)...");
  console.log("URL:", url);

  try {
    await smokeDirect(url);
  } catch (err) {
    const msg = String(err?.message || err);

    // If DNS is unavailable, retry with a public IP over HTTP.
    if (msg.includes("ENOTFOUND")) {
      const fallback = "http://93.184.216.34/"; // example.com IPv4 (public)
      console.warn("⚠️  DNS lookup failed. Retrying with fallback URL:", fallback);
      await smokeDirect(fallback);
      return;
    }

    throw err;
  }
}

async function smokeDirect(url) {
  const report = await analyzeUrl(url);

  // Minimal assertions — keep it stable and not overly strict.
  assert(report && report.ok === true, "report.ok must be true");
  assert(typeof report.url === "string" && report.url.length > 0, "report.url must be present");
  assert(Array.isArray(report.detections), "report.detections must be an array");
  assert(report.summary != null, "report.summary must be present");
  assert(Array.isArray(report.recommendations), "report.recommendations must be an array");

  console.log(
    JSON.stringify(
      {
        ok: report.ok,
        url: report.url,
        finalUrl: report.finalUrl,
        detectionCount: report.detections.length,
        recommendationCount: report.recommendations.length,
        timings: report.timings,
      },
      null,
      2,
    ),
  );
}

async function smokeApi(baseUrl, url) {
  console.log("Running smoke test in API mode...");
  console.log("Base:", baseUrl);
  console.log("URL:", url);

  // 1) /health
  const health = await httpGetJson(new URL("/health", baseUrl).toString());
  assert(health && health.ok === true, "/health must return { ok: true }");

  // 2) /analyze?url=...
  const analyze = new URL("/analyze", baseUrl);
  analyze.searchParams.set("url", url);
  analyze.searchParams.set("pretty", "0");
  analyze.searchParams.set("includeMeta", "1");

  const res = await httpGetJson(analyze.toString());
  assert(res && res.ok === true, "/analyze must return ok:true");
  assert(Array.isArray(res.technologies), "response.technologies must be an array");
  assert(res.summary != null, "response.summary must be present");
  assert(Array.isArray(res.recommendations), "response.recommendations must be an array");

  console.log(
    JSON.stringify(
      {
        ok: res.ok,
        url: res.url,
        finalUrl: res.finalUrl,
        technologies: res.technologies.length,
        recommendations: res.recommendations.length,
      },
      null,
      2,
    ),
  );
}

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === "https:" ? https : http;

    const req = lib.request(
      {
        method: "GET",
        hostname: u.hostname,
        port: u.port || (u.protocol === "https:" ? 443 : 80),
        path: u.pathname + u.search,
        headers: { Accept: "application/json" },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 500)}`));
          }
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${e?.message || String(e)}`));
          }
        });
      },
    );

    req.on("error", reject);
    req.end();
  });
}

function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

main().catch((err) => {
  console.error("❌ Smoke test failed:", err?.message || err);
  process.exit(1);
});
