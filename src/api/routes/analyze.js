const express = require("express");
const { analyzeUrl } = require("../../core/analyzer");
const { buildCleanReport } = require("../../core/report/cleanReport");

const router = express.Router();

/**
 * GET /analyze
 *
 * Lightweight response intended for frontend display.
 *
 * Example:
 *   /analyze?url=https://react.dev/
 *
 * Notes:
 * - Uses the same analyzer + cache as POST /analyze.
 * - Returns a compact report:
 *   - detected technologies
 *   - HubSpot recommendations + next actions
 *   - (optionally) meta via ?includeMeta=1
 * - No raw evidence blobs or debug signals.
 */
router.get("/analyze", async (req, res) => {
  try {
    const url = req.query?.url;
    if (!url || typeof url !== "string") {
      return res.status(400).json({
        ok: false,
        error: "Missing or invalid 'url' in query string",
        example: "/analyze?url=https://react.dev/",
      });
    }

    const report = await analyzeUrl(url);

    const pretty = req.query.pretty === "1" || req.query.pretty === "true";
    const includeMeta =
      req.query.includeMeta === "1" || req.query.includeMeta === "true";

    const response = buildCleanReport(report, { includeMeta });

    if (pretty) {
      res.setHeader("Content-Type", "application/json");
      return res.status(200).send(JSON.stringify(response, null, 2));
    }

    return res.json(response);
  } catch (err) {
    return res.status(400).json({
      ok: false,
      error: err.message || "Unknown error",
    });
  }
});

router.post("/analyze", async (req, res) => {
  try {
    const url = req.body?.url;

    if (!url || typeof url !== "string") {
      return res.status(400).json({
        ok: false,
        error: "Missing or invalid 'url' in request body",
        example: { url: "https://react.dev/" },
      });
    }

    const report = await analyzeUrl(url);

    const includeEvidence = req.query.includeEvidence !== "0";
    const includeSignals =
      req.query.includeSignals === "1" || req.query.includeSignals === "true";
    const pretty = req.query.pretty === "1" || req.query.pretty === "true";

    const response = { ...report };

    // Never return _debugSignals directly
    const debug = response._debugSignals;
    delete response._debugSignals;

    if (!includeEvidence) {
      // strip evidence from detections
      response.detections = (response.detections || []).map((d) => {
        const { evidence, ...rest } = d;
        return rest;
      });

      // strip evidence from grouped detections too
      if (response.groups && typeof response.groups === "object") {
        const newGroups = {};
        for (const [groupName, items] of Object.entries(response.groups)) {
          newGroups[groupName] = (items || []).map((d) => {
            const { evidence, ...rest } = d;
            return rest;
          });
        }
        response.groups = newGroups;
      }
    }

    if (includeSignals) {
      response.signals = {
        metaKeys: Object.keys(debug?.meta || {}).slice(0, 50),
        scriptSrcPreview: (debug?.scriptSrc || []).slice(0, 20),
        cookieNames: debug?.cookies || [],
      };
    }

    if (pretty) {
      res.setHeader("Content-Type", "application/json");
      return res.status(200).send(JSON.stringify(response, null, 2));
    }

    return res.json(response);
  } catch (err) {
    return res.status(400).json({
      ok: false,
      error: err.message || "Unknown error",
    });
  }
});

module.exports = { analyzeRouter: router };
