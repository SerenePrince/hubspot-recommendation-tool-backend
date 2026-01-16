// backend/src/cli/taxonomy.js
const { loadTechDb } = require("../core/techdb/loadTechDb");

async function main() {
  const db = await loadTechDb();

  const groups = Object.entries(db.groupsById || {})
    .map(([id, g]) => ({ id: String(id), name: g.name }))
    .sort((a, b) => Number(a.id) - Number(b.id));

  const categories = Object.entries(db.categoriesById || {})
    .map(([id, c]) => ({
      id: String(id),
      name: c.name,
      groups: (c.groups || []).map((gid) => {
        const g = db.groupsById?.[String(gid)];
        return g
          ? { id: String(gid), name: g.name }
          : { id: String(gid), name: null };
      }),
    }))
    .sort((a, b) => Number(a.id) - Number(b.id));

  console.log(`Groups (${groups.length}):`);
  for (const g of groups) {
    console.log(`- ${g.id}: ${g.name}`);
  }

  console.log("");
  console.log(`Categories (${categories.length}):`);
  for (const c of categories) {
    const gs = c.groups
      .map((g) => (g.name ? `${g.name}(${g.id})` : `unknown(${g.id})`))
      .join(", ");
    console.log(`- ${c.id}: ${c.name}  -> groups: ${gs}`);
  }

  console.log("");
  console.log("Mapping tips:");
  console.log(
    "- Use category *names* in byCategory (easier to read), OR ids if you want stability.",
  );
  console.log(
    "- Use group *names* in byGroup (easier to read), OR ids if you want stability.",
  );
  console.log(
    "- If you switch to ids later, we can support both with a small update.",
  );
}

main().catch((err) => {
  console.error("ERROR:", err.message || err);
  process.exit(1);
});
