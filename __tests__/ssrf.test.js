/**
 * Unit tests for SSRF protections (Phase 2: Page Fetching).
 *
 * Focus:
 * - isBlockedIp: correctly blocks private/loopback/link-local/reserved address ranges
 * - assertPublicHost: blocks obvious internal hostnames and blocks if DNS resolves to blocked IPs
 *
 * These tests aim to ensure the backend enforces the report's SSRF guardrails consistently.
 */
const dns = require("node:dns").promises;

describe("core/fetch/ssrf", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test("isBlockedIp blocks common IPv4 reserved/private ranges", () => {
    const { isBlockedIp } = require("../src/core/fetch/ssrf");

    // 127.0.0.0/8 (loopback)
    expect(isBlockedIp("127.0.0.1")).toBe(true);

    // 10.0.0.0/8 (private)
    expect(isBlockedIp("10.1.2.3")).toBe(true);

    // 172.16.0.0/12 (private)
    expect(isBlockedIp("172.16.0.1")).toBe(true);
    expect(isBlockedIp("172.31.255.254")).toBe(true);
    expect(isBlockedIp("172.32.0.1")).toBe(false);

    // 192.168.0.0/16 (private)
    expect(isBlockedIp("192.168.1.10")).toBe(true);

    // 169.254.0.0/16 (link-local)
    expect(isBlockedIp("169.254.1.1")).toBe(true);

    // 100.64.0.0/10 (carrier-grade NAT)
    expect(isBlockedIp("100.64.0.1")).toBe(true);
    expect(isBlockedIp("100.127.255.254")).toBe(true);
    expect(isBlockedIp("100.128.0.1")).toBe(false);

    // Public example
    expect(isBlockedIp("8.8.8.8")).toBe(false);
  });

  test("isBlockedIp blocks IPv6 loopback/link-local/ULA and IPv4-mapped loopback", () => {
    const { isBlockedIp } = require("../src/core/fetch/ssrf");

    // loopback/unspecified
    expect(isBlockedIp("::1")).toBe(true);
    expect(isBlockedIp("::")).toBe(true);

    // Unique local addresses (fc00::/7)
    expect(isBlockedIp("fc00::1")).toBe(true);
    expect(isBlockedIp("fd12:3456:789a::1")).toBe(true);

    // Link-local (fe80::/10)
    expect(isBlockedIp("fe80::1")).toBe(true);
    expect(isBlockedIp("febf::1")).toBe(true);

    // IPv4-mapped IPv6
    expect(isBlockedIp("::ffff:127.0.0.1")).toBe(true);
    expect(isBlockedIp("::ffff:8.8.8.8")).toBe(false);

    // Public v6 example
    expect(isBlockedIp("2001:4860:4860::8888")).toBe(false);
  });

  test("assertPublicHost blocks localhost-ish hostnames", async () => {
    const { assertPublicHost } = require("../src/core/fetch/ssrf");

    await expect(assertPublicHost("localhost")).rejects.toMatchObject({ code: "SSRF_BLOCKED_HOST" });
    await expect(assertPublicHost("myapp.localhost")).rejects.toMatchObject({ code: "SSRF_BLOCKED_HOST" });

    await expect(assertPublicHost("corp.local")).rejects.toMatchObject({ code: "SSRF_BLOCKED_HOST" });
    await expect(assertPublicHost("service.internal")).rejects.toMatchObject({ code: "SSRF_BLOCKED_HOST" });
    await expect(assertPublicHost("router.lan")).rejects.toMatchObject({ code: "SSRF_BLOCKED_HOST" });
  });

  test("assertPublicHost blocks IP literals in blocked ranges", async () => {
    const { assertPublicHost } = require("../src/core/fetch/ssrf");

    await expect(assertPublicHost("127.0.0.1")).rejects.toMatchObject({ code: "SSRF_BLOCKED_IP" });
    await expect(assertPublicHost("10.0.0.5")).rejects.toMatchObject({ code: "SSRF_BLOCKED_IP" });
    await expect(assertPublicHost("::1")).rejects.toMatchObject({ code: "SSRF_BLOCKED_IP" });
  });

  test("assertPublicHost allows public IP literals", async () => {
    const { assertPublicHost } = require("../src/core/fetch/ssrf");

    await expect(assertPublicHost("8.8.8.8")).resolves.toEqual({ ips: ["8.8.8.8"] });
  });

  test("assertPublicHost rejects when DNS fails", async () => {
    jest.spyOn(dns, "lookup").mockRejectedValueOnce(new Error("DNS down"));

    const { assertPublicHost } = require("../src/core/fetch/ssrf");
    await expect(assertPublicHost("example.com")).rejects.toMatchObject({ code: "SSRF_DNS_FAIL" });
  });

  test("assertPublicHost rejects if ANY resolved record is blocked", async () => {
    jest.spyOn(dns, "lookup").mockResolvedValueOnce([
      { address: "8.8.8.8", family: 4 },
      { address: "127.0.0.1", family: 4 },
    ]);

    const { assertPublicHost } = require("../src/core/fetch/ssrf");
    await expect(assertPublicHost("mixed.example")).rejects.toMatchObject({ code: "SSRF_BLOCKED_IP" });
  });

  test("assertPublicHost returns all resolved IPs when public", async () => {
    jest.spyOn(dns, "lookup").mockResolvedValueOnce([
      { address: "93.184.216.34", family: 4 },
      { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 },
    ]);

    const { assertPublicHost } = require("../src/core/fetch/ssrf");
    await expect(assertPublicHost("example.com")).resolves.toEqual({
      ips: ["93.184.216.34", "2606:2800:220:1:248:1893:25c8:1946"],
    });
  });
});
