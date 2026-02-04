/**
 * Unit tests for the Phase 1..5 orchestrator (analyzeUrl + initTechDb).
 *
 * We mock each phase boundary to ensure:
 * - initTechDb caches the loaded DB and de-dupes concurrent initialization
 * - analyzeUrl wires together fetchPage -> buildSignals -> detectTechnologies -> enrich -> summarize -> group -> recommendations
 * - outputs are stably sorted (confidence desc then name asc)
 * - debugSignals are included only when config.debugSignals is enabled
 */
describe("core/analyzer - initTechDb / analyzeUrl", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test("initTechDb loads DB only once (even with concurrent calls)", async () => {
    const db = { technologies: { React: { name: "React" } } };
    const loadTechDb = jest.fn(async () => {
      // simulate some latency
      await new Promise((r) => setTimeout(r, 10));
      return db;
    });

    jest.doMock("../src/core/techdb/loadTechDb", () => ({ loadTechDb }));

    // Minimal mocks to satisfy require graph
    jest.doMock("../src/core/fetch/fetchPage", () => ({ fetchPage: jest.fn() }));
    jest.doMock("../src/core/normalize/signals", () => ({ buildSignals: jest.fn() }));
    jest.doMock("../src/core/detect/detectTechnologies", () => ({ detectTechnologies: jest.fn(() => []) }));
    jest.doMock("../src/core/report/enrichDetections", () => ({ enrichDetections: jest.fn(() => []) }));
    jest.doMock("../src/core/report/recommendations", () => ({ buildRecommendations: jest.fn(() => []) }));
    jest.doMock("../src/core/report/summarize", () => ({ buildSummary: jest.fn(() => ({})) }));
    jest.doMock("../src/core/report/groupDetections", () => ({ groupDetections: jest.fn(() => ({})) }));

    const { initTechDb } = require("../src/core/analyzer");

    const [a, b, c] = await Promise.all([initTechDb(), initTechDb(), initTechDb()]);
    expect(a).toBe(db);
    expect(b).toBe(db);
    expect(c).toBe(db);
    expect(loadTechDb).toHaveBeenCalledTimes(1);
  });

  test("analyzeUrl produces a stable report and sorted detections", async () => {
    const db = { technologies: { React: { name: "React" }, Vue: { name: "Vue" } } };

    jest.doMock("../src/core/techdb/loadTechDb", () => ({ loadTechDb: jest.fn(async () => db) }));

    jest.doMock("../src/core/fetch/fetchPage", () => ({
      fetchPage: jest.fn(async () => ({
        timingMs: 5,
        finalUrl: "https://example.com/",
        status: 200,
        contentType: "text/html",
        bytes: 123,
        headers: { server: "x" },
        html: "<html></html>",
        external: { scripts: [], stylesheets: [] },
      })),
    }));

    jest.doMock("../src/core/normalize/signals", () => ({ buildSignals: jest.fn(() => ({ url: "https://example.com/" })) }));

    // Return unsorted detections, analyzer should enrich then sort by confidence desc then name asc
    jest.doMock("../src/core/detect/detectTechnologies", () => ({
      detectTechnologies: jest.fn(() => [
        { slug: "Vue", name: "Vue", confidence: 80 },
        { slug: "React", name: "React", confidence: 90 },
      ]),
    }));

    jest.doMock("../src/core/report/enrichDetections", () => ({
      enrichDetections: jest.fn((_db, dets) =>
        dets.map((d) => ({
          ...d,
          categories: [{ id: 1, name: "Frontend" }],
          groups: [{ id: 1, name: "JS" }],
        })),
      ),
    }));

    jest.doMock("../src/core/report/summarize", () => ({ buildSummary: jest.fn(() => ({ totalDetections: 2 })) }));
    jest.doMock("../src/core/report/groupDetections", () => ({ groupDetections: jest.fn(() => ({ byCategory: {} })) }));
    jest.doMock("../src/core/report/recommendations", () => ({ buildRecommendations: jest.fn(() => [{ title: "x" }]) }));

    // Ensure debugSignals off for this test
    jest.doMock("../src/core/config", () => ({ config: { debugSignals: false } }));

    const { analyzeUrl } = require("../src/core/analyzer");
    const report = await analyzeUrl("https://example.com/");

    expect(report.ok).toBe(true);
    expect(report.url).toBe("https://example.com/");
    expect(report.finalUrl).toBe("https://example.com/");

    expect(report.detections.map((d) => d.name)).toEqual(["React", "Vue"]);
    expect(report.summary.totalDetections).toBe(2);
    expect(report.recommendations).toEqual([{ title: "x" }]);
    expect(report._debugSignals).toBeUndefined();
  });

  test("includes _debugSignals only when enabled via config", async () => {
    const db = { technologies: {} };

    jest.doMock("../src/core/techdb/loadTechDb", () => ({ loadTechDb: jest.fn(async () => db) }));
    jest.doMock("../src/core/fetch/fetchPage", () => ({
      fetchPage: jest.fn(async () => ({
        timingMs: 1,
        finalUrl: "https://example.com/",
        status: 200,
        contentType: "text/html",
        bytes: 1,
        headers: { "set-cookie": ["a=b"] },
        html: "<html></html>",
        external: { scripts: [], stylesheets: [] },
      })),
    }));
    jest.doMock("../src/core/normalize/signals", () => ({
      buildSignals: jest.fn(() => ({ meta: { a: "b" }, scriptSrc: ["x"], cookies: ["a"] })),
    }));
    jest.doMock("../src/core/detect/detectTechnologies", () => ({ detectTechnologies: jest.fn(() => []) }));
    jest.doMock("../src/core/report/enrichDetections", () => ({ enrichDetections: jest.fn(() => []) }));
    jest.doMock("../src/core/report/summarize", () => ({ buildSummary: jest.fn(() => ({})) }));
    jest.doMock("../src/core/report/groupDetections", () => ({ groupDetections: jest.fn(() => ({})) }));
    jest.doMock("../src/core/report/recommendations", () => ({ buildRecommendations: jest.fn(() => []) }));

    jest.doMock("../src/core/config", () => ({ config: { debugSignals: true } }));

    const { analyzeUrl } = require("../src/core/analyzer");
    const report = await analyzeUrl("https://example.com/");

    expect(report._debugSignals).toEqual({
      metaKeys: ["a"],
      scriptSrcPreview: ["x"],
      cookieNames: ["a"],
    });
  });
});
