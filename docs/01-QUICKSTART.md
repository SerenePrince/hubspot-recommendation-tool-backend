# Quick Start

This guide walks through the fastest way to run and test the backend locally.

---

## Prerequisites

- **Node.js 24 (LTS)**
- npm
- (Optional) Docker + Docker Compose

---

## Local Development (Node)

### 1. Install dependencies

```bash
npm install
````

---

### 2. Validate configuration

Before running the service, validate environment and dataset paths:

```bash
npm run validate-config
```

You should see:

```text
✅ Config validation passed.
```

---

### 3. Start the API

```bash
npm run dev
```

The API will be available at:

```text
http://localhost:3001
```

---

### 4. Test the API

```bash
curl "http://localhost:3001/analyze?url=https://example.com&pretty=1"
```

Expected output:

* `ok: true`
* `technologies`: array (may be empty)
* `recommendations`: array
* `summary`: object

---

## Docker (Recommended)

### Build and run

```bash
docker compose build
docker compose up
```

---

### Verify health

```bash
curl http://localhost:3001/health
```

Expected response:

```json
{ "ok": true }
```

---

## CLI Quick Test

You can run the analyzer without starting the server:

```bash
npm run cli -- https://example.com --format json-pretty  # (alias: --format json-pretty  # (alias: --pretty))
```

This is useful for:

* Debugging detection logic
* Verifying dataset integrity
* Running quick manual checks

---

## Smoke Test

Run a basic end-to-end sanity check:

```bash
npm run smoke
```

This verifies:

* Tech DB loading
* Page fetching
* Detection pipeline
* Recommendation generation

---

## Next Steps

* See `02-ARCHITECTURE.md` for system internals
* See `05-API.md` for full endpoint documentation
* See `06-CLI.md` for advanced CLI usage
* See `09-DEPLOYMENT.md` before production rollout
