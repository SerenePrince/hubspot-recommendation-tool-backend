// backend/src/core/detect/resolve/implies.js

/**
 * Apply "implies" relationships:
 * - If A is detected, B may be implied.
 * - We add implied techs if they exist in DB and are not excluded.
 *
 * Confidence for implied techs is conservative:
 * - default to 50 unless the implied rule provides a confidence directive.
 *
 * Vendor DB can represent implies as:
 * - string "tech"
 * - array ["tech1", "tech2"]
 * - or strings containing directives e.g. "tech\\;confidence:80"
 */

const { compilePattern } = require("../compilePattern");

function resolveImplies(detections, db) {
  if (!Array.isArray(detections) || !db?.technologies) return detections || [];

  const bySlug = new Map(detections.map((d) => [d.slug, { ...d }]));

  for (const d of detections) {
    const tech = db.technologies[d.slug];
    if (!tech) continue;

    const implies = normalizeImplies(tech.implies);
    for (const imp of implies) {
      const target = imp.slug;
      if (!target) continue;
      if (!db.technologies[target]) continue;

      if (!bySlug.has(target)) {
        bySlug.set(target, {
          slug: target,
          name: db.technologies[target].name || target,
          confidence: clampConfidence(imp.confidence ?? 50),
        });
      } else {
        // If already present, keep higher confidence
        const existing = bySlug.get(target);
        existing.confidence = Math.max(existing.confidence || 0, clampConfidence(imp.confidence ?? 50));
        bySlug.set(target, existing);
      }
    }
  }

  return Array.from(bySlug.values());
}

function normalizeImplies(v) {
  if (!v) return [];
  const items = Array.isArray(v) ? v : [v];

  const out = [];
  for (const item of items) {
    const s = String(item || "").trim();
    if (!s) continue;

    // Reuse compilePattern directive parser:
    // We feed it a "pattern" that we don't intend to use as regex; we only want directives.
    // But compilePattern expects a regex. So we parse ourselves:
    const parsed = parseImpliesString(s);
    if (parsed) out.push(parsed);
  }

  return out;
}

function parseImpliesString(s) {
  // implies strings often look like:
  // "jquery"
  // "jquery\\;confidence:80"
  // We'll split on unescaped semicolons similarly to compilePattern.
  const parts = splitDirectives(s);
  const slug = parts.shift()?.trim();
  if (!slug) return null;

  // Parse directives from remaining parts
  const directives = {};
  for (const p of parts) {
    const part = String(p || "").trim();
    if (!part) continue;
    const idx = part.indexOf(":");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim().toLowerCase();
    const val = part.slice(idx + 1).trim();

    if (key === "confidence") {
      const n = Number(val);
      if (Number.isFinite(n)) directives.confidence = n;
    }
  }

  return { slug, confidence: directives.confidence };
}

function splitDirectives(s) {
  const out = [];
  let buf = "";
  let escaped = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (escaped) {
      buf += ch;
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      buf += ch;
      escaped = true;
      continue;
    }

    if (ch === ";") {
      out.push(buf);
      buf = "";
      continue;
    }

    buf += ch;
  }

  out.push(buf);
  return out;
}

function clampConfidence(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 50;
  if (x < 0) return 0;
  if (x > 100) return 100;
  return Math.round(x);
}

module.exports = { resolveImplies };
