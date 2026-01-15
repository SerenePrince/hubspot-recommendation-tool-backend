# HubSpot Recommendation Tool (Backend)

Surface-level technology detection + HubSpot-focused recommendations.

This backend:

- Fetches a **single URL** (HTML + response headers)
- Detects technologies using a fingerprint dataset (Webappalyzer-style patterns)
- Enriches detections with categories/groups
- Produces HubSpot recommendations + Inbox-style **Next Actions**
- Exposes both:
  - HTTP API (for future frontend & integrations)
  - CLI command (for internal use / audits)

---

## Documentation

Full documentation lives in `backend/docs/`.

### Table of contents

0. [Overview](docs/00-OVERVIEW.md)
1. [Quickstart](docs/01-QUICKSTART.md)
2. [Architecture](docs/02-ARCHITECTURE.md)
3. [Dataset](docs/03-DATASET.md)
4. [Configuration](docs/04-CONFIGURATION.md)
5. [API](docs/05-API.md)
6. [CLI](docs/06-CLI.md)
7. [Recommendations](docs/07-RECOMMENDATIONS.md)
8. [Next Actions](docs/08-NEXT-ACTIONS.md)
9. [Security & Guardrails](docs/09-SECURITY-GUARDRAILS.md)
10. [Deployment](docs/10-DEPLOYMENT.md)
11. [Troubleshooting](docs/11-TROUBLESHOOTING.md)
12. [Contributing](docs/12-CONTRIBUTING.md)
13. [Client Report Guide](docs/CLIENT-REPORT-GUIDE.md)

---

## Requirements

- Node.js **18+** (Node 20 recommended)
- npm

---

## Data / Fingerprints

This project expects a vendor dataset at:

```

../data/vendor/webappanalyzer/src

```

That folder must contain:

- `categories.json`
- `groups.json`
- `technologies/` (a.json … z.json, \_.json)

Example structure:

```

hubspot-recommendation-tool/
backend/
frontend/
data/
vendor/
webappanalyzer/
src/
categories.json
groups.json
technologies/
a.json
...
_.json

```

---

## Installation

From `backend/`:

```bash
npm install
```

---

## Environment Setup

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

Restart the server after editing `.env`.

---

## Run API Server

```bash
npm run dev:api
```

Health check:

```bash
curl -s http://localhost:3001/health
```

Analyze a URL:

```bash
curl -s -X POST "http://localhost:3001/analyze?pretty=1" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://react.dev/"}'
```

### Analyze Options

Query parameters:

| Param               | Purpose                       |
| ------------------- | ----------------------------- |
| `pretty=1`          | Human-readable JSON           |
| `includeEvidence=0` | Remove evidence arrays        |
| `includeSignals=1`  | Include safe signal summaries |

> Raw HTML is **never** returned by the API.

---

## CLI Usage

Run an analysis without starting the server:

```bash
npm run cli -- https://react.dev/
```

Show more evidence:

```bash
npm run cli -- https://react.dev/ --all-evidence
```

View available category/group taxonomy:

```bash
npm run cli:tax
```

---

## Configuration Files

### Recommendations Mapping

File:

```
../data/alternatives/hubspot-mapping.json
```

Supported rule keys:

- `byTechnology`
- `byCategoryId`, `byCategory`
- `byGroupId`, `byGroup`

Both **ID-based** and **name-based** rules are supported.

### Next Actions Rules

File:

```
../data/alternatives/inbox-next-actions.json
```

Controls the “Next Actions” section shown in reports.

---

## Config Introspection Endpoints

Validate loaded configuration at runtime:

```bash
curl -s "http://localhost:3001/config/recommendations?pretty=1"
curl -s "http://localhost:3001/config/next-actions?pretty=1"
curl -s "http://localhost:3001/techdb/taxonomy?pretty=1"
```

---

## Notes & Guardrails

- **Single-page fetch only**
- **No crawling**
- **No scanning**
- **No private network access**
- **SSRF protections enforced**
- Designed for **surface-level identification only**

---

## Development Tips

- All non-code customization lives in:

  ```
  data/alternatives/
  ```

- After modifying config files:

  - restart the backend
  - or run `npm run smoke` to verify
