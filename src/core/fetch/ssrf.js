// backend/src/core/fetch/ssrf.js
const dns = require("dns").promises;
const net = require("net");

/**
 * Returns true if the IP is in a blocked range (private, localhost, link-local).
 * Supports IPv4 and IPv6.
 */
function isBlockedIp(ip) {
  const family = net.isIP(ip);
  if (family === 4) return isBlockedIpv4(ip);
  if (family === 6) return isBlockedIpv6(ip);
  return true; // unknown? block
}

function isBlockedIpv4(ip) {
  // Normalize + split
  const parts = ip.split(".").map((p) => Number(p));
  if (
    parts.length !== 4 ||
    parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)
  )
    return true;

  const [a, b] = parts;

  // localhost 127.0.0.0/8
  if (a === 127) return true;

  // 0.0.0.0/8 (current network) - treat as blocked
  if (a === 0) return true;

  // 10.0.0.0/8
  if (a === 10) return true;

  // 172.16.0.0/12 -> 172.16.0.0 to 172.31.255.255
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;

  // 169.254.0.0/16 (link-local)
  if (a === 169 && b === 254) return true;

  // 100.64.0.0/10 (carrier-grade NAT) - often internal-ish; block to be safe
  if (a === 100 && b >= 64 && b <= 127) return true;

  return false;
}

function isBlockedIpv6(ip) {
  const lower = ip.toLowerCase();

  // loopback
  if (lower === "::1") return true;

  // unspecified
  if (lower === "::") return true;

  // Unique local addresses fc00::/7 (fc00..fdff)
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;

  // Link-local fe80::/10 (fe80..febf)
  if (
    lower.startsWith("fe8") ||
    lower.startsWith("fe9") ||
    lower.startsWith("fea") ||
    lower.startsWith("feb")
  )
    return true;

  // IPv4-mapped IPv6 ::ffff:127.0.0.1 etc
  // Try to detect and parse the tail
  const mappedPrefix = "::ffff:";
  if (lower.startsWith(mappedPrefix)) {
    const tail = lower.slice(mappedPrefix.length);
    if (net.isIP(tail) === 4) return isBlockedIpv4(tail);
  }

  return false;
}

/**
 * Resolve hostname to IPs and reject if any resolved IP is blocked.
 * This prevents DNS rebinding to private IPs.
 */
async function assertPublicHost(hostname) {
  // obvious localhost-ish names
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost")) {
    throw new Error("Blocked host: localhost");
  }

  // If hostname itself is an IP literal, check directly
  const ipFamily = net.isIP(hostname);
  if (ipFamily) {
    if (isBlockedIp(hostname)) throw new Error(`Blocked IP: ${hostname}`);
    return { ips: [hostname] };
  }

  // Resolve A and AAAA records
  const records = await dns.lookup(hostname, { all: true, verbatim: true });

  if (!records || records.length === 0) {
    throw new Error("Could not resolve hostname");
  }

  for (const r of records) {
    if (isBlockedIp(r.address)) {
      throw new Error(`Blocked resolved IP: ${r.address}`);
    }
  }

  return { ips: records.map((r) => r.address) };
}

module.exports = { assertPublicHost, isBlockedIp };
