const express = require("express");
const { loadTechDb } = require("../../core/techdb/loadTechDb");

const router = express.Router();

let cachedDb = null;

async function getDb() {
  if (!cachedDb) cachedDb = await loadTechDb();
  return cachedDb;
}

router.get("/techdb/taxonomy", async (req, res) => {
  try {
    const db = await getDb();

    // db.categoriesById: { [id]: { id, name, groups: [...] } }
    // db.groupsById: { [id]: { id, name } }
    const groups = Object.entries(db.groupsById || {}).map(([id, g]) => ({
      id: String(id),
      name: g.name,
    }));

    const categories = Object.entries(db.categoriesById || {}).map(
      ([id, c]) => ({
        id: String(id),
        name: c.name,
        groups: (c.groups || []).map((gid) => {
          const g = db.groupsById?.[String(gid)];
          return g
            ? { id: String(gid), name: g.name }
            : { id: String(gid), name: null };
        }),
      }),
    );

    // Optional pretty output
    const pretty = req.query.pretty === "1" || req.query.pretty === "true";
    const payload = {
      ok: true,
      meta: {
        categoryCount: categories.length,
        groupCount: groups.length,
      },
      groups,
      categories,
    };

    if (pretty) {
      res.setHeader("Content-Type", "application/json");
      return res.status(200).send(JSON.stringify(payload, null, 2));
    }

    return res.json(payload);
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to load tech taxonomy",
    });
  }
});

module.exports = { techdbRouter: router };
