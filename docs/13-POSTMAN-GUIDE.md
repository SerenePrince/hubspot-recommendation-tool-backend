# Postman Guide

This project ships with a minimal Postman collection for the backend API.

---

## 1. Importing the Collection

You should have two files:

- `HubSpot-Recommendation-Tool.postman_collection.json`
- `HubSpot-Recommendation-Tool.postman_environment.json`

In Postman: **Import** → select both files → **Import**.

---

## 2. Select the Environment

In the top-right environment dropdown, choose:

**HubSpot Recommendation Tool (Local)**

Variables:

| Variable     | Value                   |
| ------------ | ----------------------- |
| `baseUrl`    | `http://localhost:3001` |
| `exampleUrl` | `https://react.dev/`    |

---

## 3. Collection Structure

This backend intentionally exposes a minimal API surface:

- **Health**
  - `GET /health`
- **Analyze**
  - `GET /analyze?url=...`
  - variations with `pretty=1` and/or `includeMeta=1`

Configuration and taxonomy are **not** exposed as HTTP endpoints. Use the CLI and local JSON files instead:

- `npm run cli:tax`
- `data/alternatives/*.json`
- `npm run validate-config`

---

## 4. Core Request: Analyze

### Default (compact)

```
GET {{baseUrl}}/analyze?url={{exampleUrl}}
```

### Pretty JSON

```
GET {{baseUrl}}/analyze?url={{exampleUrl}}&pretty=1
```

### Include metadata (cache + timings + fetch summary)

```
GET {{baseUrl}}/analyze?url={{exampleUrl}}&includeMeta=1
GET {{baseUrl}}/analyze?url={{exampleUrl}}&includeMeta=1&pretty=1
```

---

## 5. Error Handling Example

Missing `url`:

```
GET {{baseUrl}}/analyze
```

Returns:

```json
{
  "ok": false,
  "error": "Missing or invalid 'url' in query string",
  "example": "/analyze?url=https://react.dev/"
}
```

---

## 6. Typical Workflow

1. Start the backend server
2. Select the Postman environment
3. Run **Health**
4. Run **Analyze (compact)**
5. Run **Analyze (includeMeta=1)** when you need timing/cache hints

---

## 7. When Something Looks Wrong

If a detection or recommendation looks incorrect:

1. Validate configuration:

```bash
npm run validate-config
```

2. Run a smoke test:

```bash
npm run smoke
```

3. Use the CLI for deeper inspection:

```bash
npm run cli -- https://react.dev/ --pretty-json
npm run cli -- https://react.dev/ --json
```

---

## 8. Best Practices

- Use the API output for the frontend; use the CLI for debugging and deeper inspection.
- Keep the API minimal and client-focused.
- Don’t add extra “diagnostic” endpoints unless the client explicitly needs them.

---

### [← 12 Client Report Guide](12-CLIENT-REPORT-GUIDE.md) | **13 Client Report Guide** | [14 Docker Guide →](14-DOCKER-GUIDE.md)