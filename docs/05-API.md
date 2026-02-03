# API Reference

This document describes the HTTP API exposed by the backend service.

---

## Base URL

```text
http://localhost:3001
````

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

Analyze a target website and return detected technologies and recommendations.

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
curl "http://localhost:3001/analyze?url=https://example.com&pretty=1"
```

---

### Successful Response (200)

```json
{
  "ok": true,
  "url": "https://example.com",
  "finalUrl": "https://example.com/",
  "technologies": [],
  "byGroup": {},
  "recommendations": [],
  "summary": {}
}
```

---

### Error Responses

#### 400 – Invalid Request

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

#### 404 – Not Found

Returned for unknown endpoints.

---

#### 500 – Internal Error

Returned only for unexpected server errors.

---

## Response Structure

### `technologies`

Detected technologies with metadata:

* name
* confidence
* version (optional)
* description
* website
* icon
* categories
* groups

---

### `byGroup`

Technologies grouped by functional group.

---

### `recommendations`

HubSpot product recommendations generated from detected technologies.

---

### `summary`

High-level counts by group and category.

---

### `meta` (optional)

Included when `includeMeta=1`:

* fetch metadata
* timing information

---

## Notes

* API is stateless
* No authentication required
* Output is deterministic given the same input and dataset

---

## Related Documents

* `06-CLI.md`
* `07-RECOMMENDATIONS.md`
* `09-DEPLOYMENT.md`
