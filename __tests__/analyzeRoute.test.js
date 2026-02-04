/**
 * Unit tests for GET /analyze handler.
 *
 * Scope:
 * - query validation (missing/invalid URL, unsupported protocols, overly long URLs)
 * - successful path returns a "clean" report for the frontend
 * - operational AppError maps to its status code and safe message behavior
 * - limiter is acquired and released on success/failure
 */
describe("api/routes/analyze - handleAnalyze", () => {
  function mkRes() {
    return {
      statusCode: 0,
      headers: {},
      body: "",
      setHeader(k, v) {
        this.headers[String(k).toLowerCase()] = v;
      },
      end(body) {
        this.body = body || "";
      },
    };
  }

  function mkUrl(path) {
    return new URL(path, "http://localhost");
  }

  beforeEach(() => {
    jest.resetModules();
  });

  test("returns 400 when url param is missing", async () => {
    jest.doMock("../src/api/analysisLimiter", () => ({
      analysisLimiter: { acquire: jest.fn() },
    }));

    const { handleAnalyze } = require("../src/api/routes/analyze");
    const res = mkRes();
    await handleAnalyze({}, res, mkUrl("/analyze"));

    expect(res.statusCode).toBe(400);
    const json = JSON.parse(res.body);
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/missing or invalid/i);
  });

  test("returns 400 when url protocol is not http(s)", async () => {
    jest.doMock("../src/api/analysisLimiter", () => ({
      analysisLimiter: { acquire: jest.fn() },
    }));

    const { handleAnalyze } = require("../src/api/routes/analyze");
    const res = mkRes();
    await handleAnalyze({}, res, mkUrl("/analyze?url=ftp://example.com"));

    expect(res.statusCode).toBe(400);
    const json = JSON.parse(res.body);
    expect(json.error).toMatch(/only http/i);
  });

  test("successful request acquires limiter, calls analyzeUrl, and returns cleaned report", async () => {
    const release = jest.fn();

    jest.doMock("../src/api/analysisLimiter", () => ({
      analysisLimiter: { acquire: jest.fn(async () => release) },
    }));

    jest.doMock("../src/core/analyzer", () => ({
      analyzeUrl: jest.fn(async () => ({
        ok: true,
        url: "https://example.com/",
        finalUrl: "https://example.com/",
        detections: [{ slug: "React", name: "React", confidence: 90 }],
        recommendations: [{ title: "t" }],
        summary: { total: 1 },
        groups: {},
        fetch: { status: 200 },
        timings: { totalMs: 123 },
      })),
    }));

    // cleanReport is used to create a frontend-friendly response. We'll validate it's called via its output.
    jest.doMock("../src/core/report/cleanReport", () => ({
      buildSimpleReport: jest.fn((report) => ({ ok: report.ok, url: report.url, detections: report.detections })),
    }));

    const { handleAnalyze } = require("../src/api/routes/analyze");
    const res = mkRes();

    await handleAnalyze({}, res, mkUrl("/analyze?url=https://example.com&pretty=1"));

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json).toEqual({ ok: true, url: "https://example.com/", detections: [{ slug: "React", name: "React", confidence: 90 }] });

    // limiter release always called
    expect(release).toHaveBeenCalledTimes(1);
  });

  test("operational AppError maps to its statusCode and expose behavior", async () => {
    const release = jest.fn();

    jest.doMock("../src/api/analysisLimiter", () => ({
      analysisLimiter: { acquire: jest.fn(async () => release) },
    }));

    const { AppError } = require("../src/core/errors");
    jest.doMock("../src/core/analyzer", () => ({
      analyzeUrl: jest.fn(async () => {
        throw new AppError({ code: "FETCH_TIMEOUT", message: "Fetch timed out", statusCode: 504, expose: true });
      }),
    }));
    jest.doMock("../src/core/report/cleanReport", () => ({ buildSimpleReport: jest.fn() }));

    const { handleAnalyze } = require("../src/api/routes/analyze");
    const res = mkRes();

    await handleAnalyze({}, res, mkUrl("/analyze?url=https://example.com"));

    expect(res.statusCode).toBe(504);
    const json = JSON.parse(res.body);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("Fetch timed out");

    expect(release).toHaveBeenCalledTimes(1);
  });
});
