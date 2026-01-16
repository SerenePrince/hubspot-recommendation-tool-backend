// backend/src/core/detect/detectTechnologies.js
const { matchHeaders } = require("./matchers/headers");
const { matchScriptSrc } = require("./matchers/scriptSrc");
const { matchMeta } = require("./matchers/meta");
const { matchUrl } = require("./matchers/url");
const { matchCookies } = require("./matchers/cookies");
const { matchText } = require("./matchers/text");
const { matchScripts } = require("./matchers/scripts");
const { matchDom } = require("./matchers/dom");
const { matchHtml } = require("./matchers/html");
const { matchCss } = require("./matchers/css");

const { applyImplies } = require("./resolve/implies");
const { applyExcludes } = require("./resolve/excludes");
const { applyRequires } = require("./resolve/requires");

/**
 * Run matchers against signals using the loaded tech DB.
 * MVP: headers only.
 */
function detectTechnologies(db, signals) {
  const results = [];
  const index = db.index || {};

  // Headers
  for (const techName of index.headers || []) {
    const techDef = db.technologiesByName[techName];
    const d = matchHeaders(techName, techDef, signals);
    if (d.length) results.push(...d);
  }

  // scriptSrc
  for (const techName of index.scriptSrc || []) {
    const techDef = db.technologiesByName[techName];
    const d = matchScriptSrc(techName, techDef, signals);
    if (d.length) results.push(...d);
  }

  // meta
  for (const techName of index.meta || []) {
    const techDef = db.technologiesByName[techName];
    const d = matchMeta(techName, techDef, signals);
    if (d.length) results.push(...d);
  }

  // url
  for (const techName of index.url || []) {
    const techDef = db.technologiesByName[techName];
    const d = matchUrl(techName, techDef, signals);
    if (d.length) results.push(...d);
  }

  // cookies
  for (const techName of index.cookies || []) {
    const techDef = db.technologiesByName[techName];
    const d = matchCookies(techName, techDef, signals);
    if (d.length) results.push(...d);
  }

  // scripts
  for (const techName of index.scripts || []) {
    const techDef = db.technologiesByName[techName];
    const d = matchScripts(techName, techDef, signals);
    if (d.length) results.push(...d);
  }

  // dom
  for (const techName of index.dom || []) {
    const techDef = db.technologiesByName[techName];
    const d = matchDom(techName, techDef, signals);
    if (d.length) results.push(...d);
  }

  for (const techName of index.css || []) {
    const techDef = db.technologiesByName[techName];
    const d = matchCss(techName, techDef, signals);
    if (d.length) results.push(...d);
  }

  for (const techName of index.html || []) {
    const techDef = db.technologiesByName[techName];
    const d = matchHtml(techName, techDef, signals);
    if (d.length) results.push(...d);
  }

  // text (keep last; heaviest)
  for (const techName of index.text || []) {
    const techDef = db.technologiesByName[techName];
    const d = matchText(techName, techDef, signals);
    if (d.length) results.push(...d);
  }

  // Merge / resolve
  const merged = mergeDetections(results);
  const withImplies = applyImplies(db, merged);
  const mergedAgain = mergeDetections(withImplies);
  const afterExcludes = applyExcludes(db, mergedAgain);
  const afterRequires = applyRequires(db, afterExcludes);
  return mergeDetections(afterRequires);
}

function mergeDetections(detections) {
  const byName = new Map();

  for (const d of detections) {
    const existing = byName.get(d.name);
    if (!existing) {
      byName.set(d.name, { ...d, evidence: [...(d.evidence || [])] });
      continue;
    }

    existing.confidence = Math.max(existing.confidence, d.confidence);

    // Prefer a version if we don't already have one
    if (!existing.version && d.version) existing.version = d.version;

    existing.evidence.push(...(d.evidence || []));
  }

  return Array.from(byName.values()).sort(
    (a, b) => b.confidence - a.confidence,
  );
}

module.exports = { detectTechnologies };
