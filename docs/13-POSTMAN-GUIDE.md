# Postman Guide

This project includes a Postman collection and environment to test the backend API quickly.

Files:

- `docs/HubSpot-Recommendation-Tool.postman_collection.json`
- `docs/HubSpot-Recommendation-Tool.postman_environment.json`

The collection is aligned with the current API response schema (`apiVersion: "2.0"`).

---

## Import

1. Open Postman
2. Import the **collection** JSON
3. Import the **environment** JSON
4. Select the environment: **HubSpot Recommendation Tool (Local)** (or whatever name you choose)

---

## Environment Variables

| Variable | Example | Description |
| --- | --- | --- |
| `baseUrl` | `http://localhost:3001` | API base URL |
| `exampleUrl` | `https://react.dev/` | Example site to analyze |
| `apiVersion` | `2.0` | Expected API schema version |

---

## Run the API locally

```bash
npm install
npm run dev:api
```

---

## Requests

### Health

`GET /health`

Confirms the API is running.

### Analyze (compact)

`GET /analyze?url={{exampleUrl}}`

Returns the clean analysis report for frontend use.

### Analyze (pretty)

`GET /analyze?url={{exampleUrl}}&pretty=1`

Pretty-prints JSON for easy reading.

### Analyze (includeMeta)

`GET /analyze?url={{exampleUrl}}&includeMeta=1`

Includes `meta.fetch` and `meta.timings` in the response.

---

## Test Scripts

Each `GET /analyze...` request includes Postman tests that validate:

- `ok: true`
- `apiVersion: "2.0"`
- Required top-level fields: `url`, `finalUrl`, `technologies`, `byGroup`, `recommendations`, `summary`
- Technology payload includes `hubspot.primaryProduct` and ordered `hubspot.products`
- Recommendations include `triggeredBy` and `triggeredBySummary`

---

## CLI Reference (optional)

For deeper inspection:

```bash
npm run cli -- {{exampleUrl}} --format human --wrap
npm run cli:pretty -- {{exampleUrl}}
```

---
