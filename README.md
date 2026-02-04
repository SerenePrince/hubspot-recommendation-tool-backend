# HubSpot Recommendation Tool – Backend

This repository contains the backend service for the **HubSpot Recommendation Tool**.

The backend analyzes a target website, detects the technologies in use, and produces
HubSpot product recommendations based on a predefined mapping between technologies,
categories, and HubSpot offerings.

The project was developed as a **client-requested system** and is accompanied by a
formal technical report. The implementation intentionally mirrors the structure,
terminology, and phases described in that report.

---

## What This Service Does

Given a URL, the backend performs the following high-level steps:

1. **Load technology definitions** (WebAppAnalyzer dataset)
2. **Safely fetch the target page** (SSRF-protected, size-bounded)
3. **Normalize detection signals** (HTML, headers, cookies, scripts, DOM, etc.)
4. **Detect technologies** using pattern matching and resolution rules
5. **Generate recommendations** using a HubSpot mapping file

The result is a structured JSON report suitable for API consumers or CLI usage.

---

## Project Structure (High Level)

```text
backend/
├── src/
│   ├── api/        # HTTP API (GET /analyze)
│   ├── core/       # Analysis pipeline (DB → fetch → detect → report)
│   ├── cli/        # Command-line interface
│   └── scripts/    # Validation and smoke tests
├── data/
│   ├── vendor/     # WebAppAnalyzer dataset (vendored)
│   └── alternatives/ # HubSpot recommendation mapping
├── docs/           # Detailed documentation
└── Dockerfile / docker-compose.yml
````

---

## Requirements

* **Node.js 24 (LTS)**
* npm (comes with Node)
* Optional: Docker + Docker Compose

---

## Quick Start (Local)

```bash
npm install
npm run validate-config
npm run dev
```

The API will start on **[http://localhost:3001](http://localhost:3001)**.

### Test it quickly

```bash
curl "http://localhost:3001/analyze?url=https://react.dev&pretty=1"
```

---

## Docker (Recommended for Production)

```bash
docker compose build
docker compose up
```

Health check:

```bash
curl http://localhost:3001/health
```

---

## API Overview

### `GET /analyze`

Query parameters:

* `url` (required): target website
* `pretty` (optional): pretty-printed JSON
* `includeMeta` (optional): include fetch + timing metadata

Example:

```bash
curl "http://localhost:3001/analyze?url=https://example.com&pretty=1"
```

See **docs/05-API.md** for full details.

---

## CLI Usage

```bash
npm run cli -- https://example.com --format json-pretty  # (alias: --format json-pretty  # (alias: --pretty))
```

See **docs/06-CLI.md** for more examples.

---

## Documentation Index

Detailed documentation lives in `/docs`:

* `00-OVERVIEW.md` – System overview
* `02-ARCHITECTURE.md` – Backend architecture
* `05-API.md` – API reference
* `07-RECOMMENDATIONS.md` – Recommendation logic
* `09-DEPLOYMENT.md` – Deployment guidance
* `12-CLIENT-REPORT-GUIDE.md` – Mapping to the client report

---

## Important Notes

* The vendor technology dataset is **vendored** and not authored by this project.
* The backend is intentionally **deterministic** and **side-effect free**.
* Function names, directory layout, and pipeline stages align with the submitted report
  and should not be renamed without revisiting the report.

---

## License

MIT License.

