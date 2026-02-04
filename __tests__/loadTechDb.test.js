/**
 * Unit tests for techdb/loadTechDb (Phase 1: Database Loading).
 *
 * We avoid loading the full vendor dataset here; instead we create a minimal fake dataset that
 * matches the expected directory structure:
 *   root/
 *     categories.json
 *     groups.json
 *     technologies/_.json + a.json..z.json
 *
 * These tests verify:
 * - required files are enforced
 * - JSON parsing errors produce useful messages
 * - merged technologies map is formed correctly
 * - index reflects which matcher buckets exist
 */
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

describe("core/techdb/loadTechDb", () => {
  const letters = ["_.json", ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i) + ".json")];

  function mkRoot() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "techdb-"));
    fs.mkdirSync(path.join(root, "technologies"));
    fs.writeFileSync(path.join(root, "categories.json"), JSON.stringify({ 1: { id: 1, name: "Cat" } }), "utf8");
    fs.writeFileSync(path.join(root, "groups.json"), JSON.stringify({ 1: { id: 1, name: "Group" } }), "utf8");

    for (const f of letters) {
      fs.writeFileSync(path.join(root, "technologies", f), JSON.stringify({}), "utf8");
    }
    return root;
  }

  beforeEach(() => {
    jest.resetModules();
  });

  test("throws if any required technology file is missing", async () => {
    const root = mkRoot();
    fs.unlinkSync(path.join(root, "technologies", "c.json"));

    const { loadTechDb } = require("../src/core/techdb/loadTechDb");
    await expect(loadTechDb({ rootSrc: root })).rejects.toThrow(/missing required files/i);
  });

  test("throws with a helpful message on JSON parse failure", async () => {
    const root = mkRoot();
    fs.writeFileSync(path.join(root, "categories.json"), "{not-json", "utf8");

    const { loadTechDb } = require("../src/core/techdb/loadTechDb");
    await expect(loadTechDb({ rootSrc: root })).rejects.toThrow(/Failed to parse JSON/);
  });

  test("merges technologies from all files and builds a deterministic index", async () => {
    const root = mkRoot();

    // Put some technologies in a couple of shards
    fs.writeFileSync(
      path.join(root, "technologies", "a.json"),
      JSON.stringify({
        AlphaTech: { headers: { server: "alpha" }, implies: ["BetaTech"] },
      }),
      "utf8",
    );
    fs.writeFileSync(
      path.join(root, "technologies", "b.json"),
      JSON.stringify({
        BetaTech: { scriptSrc: "beta.js", requiresCategory: [1] },
      }),
      "utf8",
    );

    const { loadTechDb } = require("../src/core/techdb/loadTechDb");
    const db = await loadTechDb({ rootSrc: root });

    expect(db.technologies.AlphaTech).toBeDefined();
    expect(db.technologies.BetaTech).toBeDefined();

    // Index should indicate matcher buckets
    expect(db.index.headers).toContain("AlphaTech");
    expect(db.index.scriptSrc).toContain("BetaTech");
    expect(db.index.implies).toContain("AlphaTech");
    expect(db.index.requiresCategory).toContain("BetaTech");

    // Meta counts
    expect(db.meta.technologyFilesLoaded).toBe(27);
    expect(db.meta.techCount).toBe(2);
  });
});
