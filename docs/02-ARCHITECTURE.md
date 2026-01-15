# Architecture

This system follows a pipeline architecture:

```
URL
-> fetchPage()
-> fetched { html, headers, status, timing, finalUrl }
-> buildSignals(fetched)
-> signals { headers, cookies, meta, scriptSrc, scripts, dom, html, text, url, ... }
-> detectTechnologies(db, signals)
-> detections [{ name, confidence, version, evidence[] }, ...]
-> enrichDetections(db, detections)
-> enriched detections with categories/groups
-> buildRecommendations(enriched, mapping)
-> recommendations [{ title, hubspotProduct, priority, triggeredBy[] }, ...]
-> buildNextActions(recommendations, config)
-> nextActions [{ title, priority, why, relatedProducts[] }, ...]
```

## Key modules (backend/src/core)

### fetch/

- `fetchPage.js`
  - Performs a single fetch with safety and size limits
  - Captures headers + HTML body
  - Returns a normalized object used by later stages
- `ssrf.js`
  - Blocks localhost / private network hosts (prevents SSRF-like behavior)

### normalize/

- `signals.js`
  - Converts fetched content into “signals” used by the matcher:
    - normalized header map
    - script src list
    - meta tags
    - cookie names
    - DOM selector checks
    - inline scripts / HTML / text (depending on your implementation)

### techdb/

- `loadTechDb.js`
  - Loads the vendor dataset (categories/groups/technologies)
  - Builds an index that helps the detector know which signal types exist

### detect/

- `detectTechnologies.js`
  - Core matcher
  - Applies patterns to signals
  - Produces evidence and confidence
  - Runs post-processing (merge duplicates, implies/excludes/requires)

### report/

- `enrichDetections.js`
  - Adds category/group objects to detections
- `recommendations.js`
  - Loads mapping JSON
  - Generates deduped/capped recommendations
- `nextActions.js`
  - Loads Inbox next-actions JSON
  - Generates short list of “what to do next”

### cache/

- `simpleCache.js`
  - Simple in-memory TTL cache for reports
- `cacheKey.js`
  - Normalizes URLs to cache keys safely

### analyzer.js

- Orchestrates the entire pipeline
- Responsible for caching behavior and response shape

## API layer (backend/src/api)

- `server.js` creates Express app, mounts routers
- routes:
  - `/health`
  - `/analyze`
  - `/techdb/taxonomy`
  - `/config/recommendations`
  - `/config/next-actions`

## CLI layer (backend/src/cli)

- `index.js` runs analysis and prints report
- `formatPretty.js` prints grouped detections, recommendations, next actions
- `taxonomy.js` prints categories/groups for mapping authors

---

### [← 01 Quickstart](01-QUICKSTART.md) | **02 Architecture** | [03 Dataset →](03-DATASET.md)
