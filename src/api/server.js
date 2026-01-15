const express = require("express");
const rateLimit = require("express-rate-limit");
const { analyzeRouter } = require("./routes/analyze");
const { techdbRouter } = require("./routes/techdb");
const { configRouter } = require("./routes/config");
const { nextActionsConfigRouter } = require("./routes/nextActionsConfig");
const { config } = require("../core/config");

const app = express();
app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests/min per IP (tweak later)
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "HubSpot Recommendation Tool API" });
});

// Mount routes
app.use(analyzeRouter);
app.use(techdbRouter);
app.use(configRouter);
app.use(nextActionsConfigRouter);

const port = config.port;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
