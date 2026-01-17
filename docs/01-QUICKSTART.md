# Quickstart

This doc gets you running in the shortest time.

## Requirements

- Node.js 18+ (Node 20 recommended)
- npm
- Git (with submodule support)

> This project depends on a third-party fingerprint dataset that is included as a **Git submodule**. The submodule must be initialized before running the backend.

## Repository layout (top level)

```

hubspot-recommendation-tool/
backend/
frontend/   (future)
data/
vendor/
webappanalyzer/   ← Git submodule
src/
categories.json
groups.json
technologies/
alternatives/
hubspot-mapping.json
inbox-next-actions.json

```

## 1) Install backend deps

From `backend/`:

```bash
npm install
```

## 2) Ensure vendor dataset exists

The fingerprint dataset is provided via a Git submodule at:

`data/vendor/webappanalyzer/src`

If you cloned the repository without submodules, initialize them now:

```bash
git submodule update --init --recursive
```

Sanity check:

```bash
ls ../data/vendor/webappanalyzer/src
# should show: categories.json groups.json technologies
```

## 3) Configure environment

Create `backend/.env`:

```env
PORT=3001
NODE_ENV=development
DATA_ROOT=../data/vendor/webappanalyzer/src
FETCH_TIMEOUT_MS=12000
MAX_FETCH_BYTES=2000000
REPORT_CACHE_TTL_MS=300000
REPORT_CACHE_MAX_ENTRIES=200
```

## 4) Run the API

```bash
npm run dev
# or
npm start
```

Health check:

```bash
curl -s http://localhost:3001/health
```

Analyze:

```bash
curl -s -X POST "http://localhost:3001/analyze?pretty=1" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://react.dev/"}' | head -n 40
```

Compact (UI / frontend) analyze:

```bash
curl -s "http://localhost:3001/analyze?url=https://react.dev/&pretty=1" | head -n 60
curl -s "http://localhost:3001/analyze?url=https://react.dev/&includeMeta=1&pretty=1" | head -n 80
```

## 5) Run the CLI

```bash
npm run cli -- https://react.dev/
```

Taxonomy helper (categories & groups):

```bash
npm run cli:tax | head -n 80
```

## 6) Smoke test

Offline-friendly:

```bash
npm run smoke
```

Full end-to-end:

```bash
npm run smoke -- https://react.dev/
```

---

### [← 00 Overview](00-OVERVIEW.md) | **01 Quickstart** | [02 Architecture →](02-ARCHITECTURE.md)
