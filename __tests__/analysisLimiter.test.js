/**
 * Unit tests for the /analyze concurrency limiter.
 *
 * Validates:
 * - immediate acquisition up to maxConcurrent
 * - queued acquisitions resolve when releases happen
 * - queue overflow produces 503 AppError (serviceUnavailable)
 */
describe("api/analysisLimiter", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test("allows up to MAX_CONCURRENT_ANALYSES and queues up to MAX_QUEUED_ANALYSES", async () => {
    process.env.MAX_CONCURRENT_ANALYSES = "2";
    process.env.MAX_QUEUED_ANALYSES = "1";

    const { analysisLimiter } = require("../src/api/analysisLimiter");

    const r1 = await analysisLimiter.acquire();
    const r2 = await analysisLimiter.acquire();

    // Third should be queued (not rejected)
    const p3 = analysisLimiter.acquire();
    expect(analysisLimiter.stats()).toEqual({ inFlight: 2, queued: 1 });

    // Release one slot -> queued one resolves
    r1();
    const r3 = await p3;
    expect(typeof r3).toBe("function");
    expect(analysisLimiter.stats()).toEqual({ inFlight: 2, queued: 0 });

    // cleanup
    r2();
    r3();
    expect(analysisLimiter.stats().inFlight).toBe(0);
  });

  test("rejects when queue is full", async () => {
    process.env.MAX_CONCURRENT_ANALYSES = "1";
    process.env.MAX_QUEUED_ANALYSES = "0";

    const { analysisLimiter } = require("../src/api/analysisLimiter");
    const r1 = await analysisLimiter.acquire();

    await expect(analysisLimiter.acquire()).rejects.toMatchObject({
      name: "AppError",
      statusCode: 503,
      code: "ANALYZE_OVERLOADED",
    });

    r1();
  });
});
