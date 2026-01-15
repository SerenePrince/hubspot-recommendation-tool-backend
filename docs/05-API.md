# API

Base URL (local): `http://localhost:3001`

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
