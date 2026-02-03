// backend/src/core/fetch/ssrf.js
const dns = require("node:dns").promises;
const net = require("node:net");
const { badRequest } = require("../errors");

/**
 * Returns true if the IP is in a blocked range (private, localhost, link-local, etc).
 * Supports IPv4 and IPv6.
 *
 * NOTE: This is a conservative allowlist approach: if we can't parse confidently, we block.
 */
function isBlockedIp(ip) {
  const family = net.isIP(ip);
  if (family === 4) return isBlockedIpv4(ip);
  if (family === 6) return isBlockedIpv6(ip);
  return true; // unknown => block
}

function isBlockedIpv4(ip) {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true;
  }

  const [a, b] = parts;

  // 0.0.0.0/8 (current network) - treat as blocked
  if (a === 0) return true;

  // 127.0.0.0/8 (localhost)
  if (a === 127) return true;

  // 10.0.0.0/8 (private)
  if (a === 10) return true;

  // 172.16.0.0/12 (private)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 (private)
  if (a === 192 && b === 168) return true;

  // 169.254.0.0/16 (link-local)
  if (a === 169 && b === 254) return true;

  // 100.64.0.0/10 (carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  return false;
}

function isBlockedIpv6(ip) {
  const lower = ip.toLowerCase();

  // Loopback / unspecified
  if (lower === "::1") return true;
  if (lower === "::") return true;

  // IPv4-mapped IPv6 ::ffff:127.0.0.1 etc
  const mappedPrefix = "::ffff:";
  if (lower.startsWith(mappedPrefix)) {
    const tail = lower.slice(mappedPrefix.length);
    if (net.isIP(tail) === 4) return isBlockedIpv4(tail);
    // If it's malformed, block
    return true;
  }

  // Unique local addresses fc00::/7 (fc00..fdff)
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;

  // Link-local fe80::/10 (fe80..febf)
  if (
    lower.startsWith("fe8") ||
    lower.startsWith("fe9") ||
    lower.startsWith("fea") ||
    lower.startsWith("feb")
  ) {
    return true;
  }

  return false;
}

/**
 * Resolve hostname to IPs and reject if any resolved IP is blocked.
 * This prevents straightforward SSRF and mitigates DNS rebinding by:
 *  - blocking private/loopback/link-local results,
 *  - re-validating for every redirect hop (caller responsibility).
 *
 * NOTE: No SSRF protection is perfect without a network egress policy.
 * This is intended as an application-level guardrail.
 */
async function assertPublicHost(hostname) {
  const h = String(hostname || "").trim().toLowerCase();
  if (!h) throw badRequest("SSRF_BLOCKED_HOST", "Blocked host");

  // Obvious localhost-ish names
  if (h === "localhost" || h.endsWith(".localhost")) {
    throw badRequest("SSRF_BLOCKED_HOST", "Blocked host");
  }

  // Common internal/reserved zones that frequently resolve to RFC1918 internally
  // (conservative; avoids surprises in corp networks)
  if (h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".lan")) {
    throw badRequest("SSRF_BLOCKED_HOST", "Blocked host");
  }

  // If hostname itself is an IP literal, check directly
  const ipFamily = net.isIP(h);
  if (ipFamily) {
    if (isBlockedIp(h)) throw badRequest("SSRF_BLOCKED_IP", "Blocked host");
    return { ips: [h] };
  }

  // Resolve A/AAAA records
  let records;
  try {
    records = await dns.lookup(h, { all: true, verbatim: true });
  } catch (err) {
    throw badRequest("SSRF_DNS_FAIL", "Could not resolve hostname");
  }

  if (!records || records.length === 0) {
    throw badRequest("SSRF_DNS_EMPTY", "Could not resolve hostname");
  }

  for (const r of records) {
    if (isBlockedIp(r.address)) {
      throw badRequest("SSRF_BLOCKED_IP", "Blocked host");
    }
  }

  return { ips: records.map((r) => r.address) };
}

module.exports = { assertPublicHost, isBlockedIp };
