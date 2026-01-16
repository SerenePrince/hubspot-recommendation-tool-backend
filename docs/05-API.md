# API

Base URL (local): `http://localhost:3001`

## GET /analyze

Returns a **compact, UI-friendly report** for a single URL.

This is the recommended endpoint for a React (or any web) frontend because it returns:
- a clean list of detected technologies
- HubSpot recommendations (config-driven)
- Inbox-style next actions (config-driven)

### Request

Query params:

- `url` (required) → the URL to analyze
- `pretty=1` → pretty JSON output
- `includeMeta=1` → include lightweight metadata (cache + timings + fetch summary)

### Response (shape overview)

`meta` is included only when `includeMeta=1`.

```json
{
  "ok": true,
  "url": "https://react.dev/",
  "finalUrl": "https://react.dev/",
  "count": 3,
  "technologies": [
    {
      "name": "React",
      "confidence": 100,
      "version": null,
      "categories": [{ "id": 12, "name": "JavaScript frameworks" }],
      "groups": [{ "id": 2, "name": "Frontend" }]
    }
  ],
  "byGroup": {
    "Frontend": ["React", "Next.js"],
    "Analytics": ["Google Analytics"]
  },
  "hubspot": {
    "recommendations": [{ "hubspotProduct": "Marketing Hub", "title": "..." }],
    "nextActions": [{ "title": "...", "priority": "high" }]
  },
  "meta": {
    "cache": { "hit": false },
    "timings": { "analysisMs": 200, "totalMs": 400 },
    "fetch": { "status": 200, "contentType": "text/html" }
  }
}
```

### Example curl

```bash
curl -s "http://localhost:3001/analyze?url=https://react.dev/&pretty=1"
curl -s "http://localhost:3001/analyze?url=https://react.dev/&includeMeta=1&pretty=1"
```

## POST /analyze

Analyze a single URL.

### Request

Body JSON:

```json
{ "url": "https://react.dev/" }
```

### Query params

- `pretty=1` → pretty JSON output
- `includeEvidence=0` → remove evidence arrays
- `includeSignals=1` → include safe signal summaries (no raw HTML)

### Response (shape overview)

```json
{
  "ok": true,
  "url": "https://react.dev/",
  "finalUrl": "https://react.dev/",
  "fetch": { "status": 200, "contentType": "...", "bytes": 123, "timingMs": 100, "headers": { ... } },
  "timings": { "analysisMs": 200, "totalMs": 400 },
  "detections": [
    { "name": "Vercel", "confidence": 100, "version": null, "categories": [...], "groups": [...], "evidence": [...] }
  ],
  "recommendations": [
    { "title": "...", "hubspotProduct": "Marketing Hub", "priority": "medium", "triggerType": "...", "triggerValue": "...", "triggeredBy": [...] }
  ],
  "nextActions": [
    { "title": "...", "priority": "high", "why": "...", "relatedProducts": ["Marketing Hub"] }
  ],
  "cache": { "hit": false, "key": "..." }
}
```

### Example curl

```bash
curl -s -X POST "http://localhost:3001/analyze?pretty=1&includeEvidence=0" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://react.dev/"}'
```

## GET /health

Health check.

```bash
curl -s http://localhost:3001/health
```

## GET /techdb/taxonomy

Returns categories + groups from the local dataset.

```bash
curl -s "http://localhost:3001/techdb/taxonomy?pretty=1" | head -n 80
```

## GET /config/recommendations

Validates and summarizes loaded recommendation mapping.

```bash
curl -s "http://localhost:3001/config/recommendations?pretty=1"
curl -s "http://localhost:3001/config/recommendations?pretty=1&include=1"
```

## GET /config/next-actions

Validates and summarizes loaded next-actions config.

```bash
curl -s "http://localhost:3001/config/next-actions?pretty=1"
curl -s "http://localhost:3001/config/next-actions?pretty=1&include=1"
```

---

### [← 04 Configuration](04-CONFIGURATION.md) | **05 API** | [06 CLI →](06-CLI.md)
