// backend/src/api/analysisLimiter.js

const { config } = require("../core/config");
const { serviceUnavailable } = require("../core/errors");

/**
 * Simple in-memory concurrency limiter for /analyze.
 *
 * Why:
 * - Analysis involves network fetch + regex matching.
 * - Unbounded concurrency can exhaust sockets/CPU and make the service unstable.
 *
 * Design:
 * - Limit concurrent executions
 * - Optional bounded queue to smooth small bursts
 */

function createLimiter({ maxConcurrent, maxQueued }) {
  let inFlight = 0;
  const queue = [];

  async function acquire() {
    if (inFlight < maxConcurrent) {
      inFlight++;
      return release;
    }

    if (queue.length >= maxQueued) {
      throw serviceUnavailable(
        "ANALYZE_OVERLOADED",
        "Service is busy. Please retry in a moment.",
      );
    }

    return new Promise((resolve, reject) => {
      queue.push({ resolve, reject });
    });
  }

  function release() {
    // Hand the slot to a queued waiter if available.
    const next = queue.shift();
    if (next) {
      // Keep inFlight the same: slot transfers to next.
      next.resolve(release);
      return;
    }
    inFlight = Math.max(0, inFlight - 1);
  }

  return { acquire, stats: () => ({ inFlight, queued: queue.length }) };
}

const limiter = createLimiter({
  maxConcurrent: config.api.maxConcurrentAnalyses,
  maxQueued: config.api.maxQueuedAnalyses,
});

module.exports = { analysisLimiter: limiter };
