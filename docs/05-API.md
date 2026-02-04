# API Reference

This document describes the HTTP API exposed by the backend service.

---

## Base URL

```text
http://localhost:3001
```

---

## Health Check

### `GET /health`

Used by load balancers and orchestration systems to verify service health.

#### Response

```json
{
  "ok": true,
  "service": "HubSpot Recommendation Tool API"
}
```

* Always returns HTTP 200 when the service is healthy
* No authentication required

---

## Analyze URL

### `GET /analyze`

Analyze a target website and return detected technologies and HubSpot recommendations.

This endpoint is designed to be:

1. **Simple for frontend developers** (stable schema, pre-grouped data, sensible defaults)
2. **Useful for non-technical end users** (summary + top recommendations + traceability)

---

### Query Parameters

| Name          | Required | Description                       |
| ------------- | -------- | --------------------------------- |
| `url`         | yes      | Target URL (http or https)        |
| `pretty`      | no       | Pretty-print JSON (`1` or `true`) |
| `includeMeta` | no       | Include fetch + timing metadata   |

---

### Example Request

```bash
curl "http://localhost:3001/analyze?url=https://react.dev&pretty=1&includeMeta=1"
```

---

## Successful Response (200)

The API returns a **clean, frontend-friendly** report.

Key points:

- `apiVersion` is a stable marker for frontend integrations.
- `technologies[].hubspot.products` is **ordered primary-first** (high → medium → low; then stable first-seen).
- `recommendations[].triggeredBySummary` is a human-readable explanation of why the recommendation appeared.

Example (trimmed for readability):

```json
{
  "ok": true,
  "apiVersion": "2.0",
  "url": "https://react.dev/",
  "finalUrl": "https://react.dev/",
  "technologies": [
    {
      "name": "Google Analytics",
      "confidence": 100,
      "version": null,
      "categories": [{ "id": "analytics", "name": "Analytics" }],
      "groups": [{ "id": "analytics", "name": "Analytics" }],
      "hubspot": {
        "primaryProduct": "Marketing Hub",
        "products": [
          {
            "hubspotProduct": "Marketing Hub",
            "priority": "high",
            "title": "Unify analytics and attribution in HubSpot Marketing Hub",
            "description": "Replace disconnected analytics with CRM-native reporting that tracks marketing to revenue impact."
          },
          {
            "hubspotProduct": "Operations Hub",
            "priority": "medium",
            "title": "Operationalize analytics with HubSpot Operations Hub",
            "description": "Sync analytics events into CRM properties."
          }
        ]
      }
    }
  ],
  "byGroup": {
    "Analytics": [{ "name": "Google Analytics", "confidence": 100, "version": null }]
  },
  "recommendations": [
    {
      "title": "Unify analytics and attribution in HubSpot Marketing Hub",
      "hubspotProduct": "Marketing Hub",
      "priority": "high",
      "description": "Replace disconnected analytics with CRM-native reporting that tracks marketing to revenue impact.",
      "url": null,
      "tags": [],
      "triggeredBy": [
        { "triggerType": "technology", "key": "Google Analytics", "matched": "Google Analytics" }
      ],
      "triggeredBySummary": "Tech: Google Analytics"
    }
  ],
  "summary": {
    "totals": {
      "technologiesDetected": 6,
      "categories": 6,
      "groups": 5,
      "recommendations": 8,
      "mappedReplacements": {
        "technologiesWithReplacements": 2,
        "totalTechnologies": 6
      }
    },
    "topRecommendations": [
      {
        "title": "Unify analytics and attribution in HubSpot Marketing Hub",
        "hubspotProduct": "Marketing Hub",
        "priority": "high",
        "description": "Replace disconnected analytics with CRM-native reporting that tracks marketing to revenue impact.",
        "triggeredBySummary": "Tech: Google Analytics"
      }
    ]
  },
  "meta": {
    "fetch": { "status": 200 },
    "timings": { "totalMs": 123 }
  }
}
```

---

## Response Structure

### Top-level fields

| Field | Type | Description |
| --- | --- | --- |
| `ok` | boolean | `true` on success |
| `apiVersion` | string | Response schema version (`2.0`) |
| `url` | string | Normalized input URL |
| `finalUrl` | string | Final URL after redirects |
| `technologies` | array | Detected technologies (frontend primary payload) |
| `byGroup` | object | Technologies grouped by functional group |
| `recommendations` | array | HubSpot recommendations with traceability |
| `summary` | object | Counts + top recommendations |
| `meta` | object? | Optional fetch/timing info when `includeMeta=1` |

---

### `technologies[]`

Each technology includes a `hubspot` object for easy UI rendering:

| Field | Type | Description |
| --- | --- | --- |
| `name` | string | Technology name |
| `confidence` | number | Detection confidence |
| `version` | string? | Version when detected |
| `categories` | array | Slim taxonomy list `{id,name}` |
| `groups` | array | Slim taxonomy list `{id,name}` |
| `hubspot.primaryProduct` | string? | The primary HubSpot replacement (if available) |
| `hubspot.products` | array | Ordered replacements (primary-first) |

---

### `recommendations[]`

Recommendations are already sorted by priority (high → medium → low).

| Field | Type | Description |
| --- | --- | --- |
| `title` | string | Recommendation title |
| `hubspotProduct` | string | HubSpot product being recommended |
| `priority` | string | `high`, `medium`, or `low` |
| `description` | string? | Short explanation for UI |
| `url` | string? | Optional link for learn-more |
| `tags` | array | Optional classification tags |
| `triggeredBy` | array | Traceability: what produced this recommendation |
| `triggeredBySummary` | string? | Human-readable summary for UI |

---

### `summary`

| Field | Type | Description |
| --- | --- | --- |
| `totals` | object | Counts + mapping coverage |
| `topRecommendations` | array | Top 5 recommendations for quick UI display |

---

## Error Responses

### 400 – Invalid Request

Returned when:

* `url` is missing or invalid
* Unsupported protocol
* Target site is blocked by SSRF rules
* Fetch fails or times out

```json
{
  "ok": false,
  "error": "Invalid URL format"
}
```

---

### 404 – Not Found

Returned for unknown endpoints.

---

### 500 – Internal Error

Returned only for unexpected server errors.

---

## Notes

* API is stateless
* No authentication required (add it at the gateway if needed)
* Output is deterministic given the same input and dataset

---

## Related Documents

* `06-CLI.md`
* `07-RECOMMENDATIONS.md`
* `12-CLIENT-REPORT-GUIDE.md`
* `09-DEPLOYMENT.md`
