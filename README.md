# HubSpot Technology Intelligence Platform (Backend)

Surface-level technology detection with **HubSpot-focused marketing intelligence**.

This backend analyzes a single public website, identifies the technologies in use,
and translates those findings into **HubSpot product recommendations and actionable next steps**.

It is designed for:

- sales & pre-sales intelligence
- marketing strategy and audits
- CRM enrichment (including HubSpot itself)
- future frontend dashboards

---

## What This Backend Does

- Fetches a **single public URL** (HTML + response headers only)
- Detects technologies using a fingerprint dataset (Webappalyzer-style patterns)
- Normalizes detections into **categories and groups**
- Applies **client-configurable HubSpot recommendation rules**
- Generates Inbox-style **Next Actions**
- Exposes both:
  - an HTTP API (for frontend & integrations)
  - a CLI (for internal audits and client reports)

This is **not** a crawler or scanner — it is intentionally surface-level and safe.

---

## Documentation

Full documentation lives in `backend/docs/`.

### Table of Contents

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
- Git (with submodule support)

---

## Third-Party Dataset (Git Submodule)

This project depends on a third-party fingerprint dataset (Webappalyzer-style)
which is included in this repository as a **Git submodule**.

The dataset is **not copied into this codebase**.
Instead, this repository pins a specific commit of the upstream project to ensure
reproducible detection results across environments.

You must initialize the submodule before running the backend.

---

## Dataset / Fingerprints

This project relies on a third-party fingerprint dataset provided via a Git submodule
located at:

```
../data/vendor/webappanalyzer/src
```

That directory must contain:

- `categories.json`
- `groups.json`
- `technologies/` (a.json … z.json, `_.json`)

Example structure:

```
hubspot-technology-intelligence/
├─ backend/
├─ frontend/
├─ data/
│  └─ vendor/
│     └─ webappanalyzer/      ← Git submodule
│        └─ src/
│           ├─ categories.json
│           ├─ groups.json
│           └─ technologies/
│              ├─ a.json
│              ├─ ...
│              └─ _.json
```

---

## Installation

Clone the repository **with submodules**:

```bash
git clone --recurse-submodules <REPO_URL>
```

If you already cloned the repository without submodules:

```bash
git submodule update --init --recursive
```

Then, from `backend/`:

```bash
npm install
```

---

## Environment Setup

Create `backend/.env` based on `.env.example`:

```env
PORT=3001
NODE_ENV=development

# Path to the fingerprint dataset (Git submodule)
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

---

## API Usage

### Compact UI / Client Endpoint

```bash
curl -s "http://localhost:3001/analyze?url=https://react.dev/&pretty=1"
```

Returns:

- detected technologies
- HubSpot recommendations
- next actions
- optional metadata

---

### Full Intelligence Endpoint

```bash
curl -s -X POST "http://localhost:3001/analyze?pretty=1" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://react.dev/"}'
```

Returns the **complete professional report**, including evidence and signals.

#### POST Options

| Param               | Purpose                       |
| ------------------- | ----------------------------- |
| `pretty=1`          | Human-readable JSON           |
| `includeEvidence=0` | Remove evidence arrays        |
| `includeSignals=1`  | Include safe signal summaries |

> Raw HTML is **never returned** by the API.

---

## CLI Usage

Run an analysis without starting the server:

```bash
npm run cli -- https://react.dev/
```

Include all evidence:

```bash
npm run cli -- https://react.dev/ --all-evidence
```

View category & group taxonomy:

```bash
npm run cli:tax
```

The CLI uses the **same detection and recommendation engines** as the API.

---

## Configuration (Client-Owned Logic)

All business logic for recommendations lives outside the codebase.

### HubSpot Recommendations

```
data/alternatives/hubspot-mapping.json
```

Supported rule types:

- `byTechnology`
- `byCategoryId`, `byCategory`
- `byGroupId`, `byGroup`

ID-based rules are preferred for stability.

---

### Next Actions

```
data/alternatives/inbox-next-actions.json
```

Defines Inbox-style actions based on recommended HubSpot products.

---

## Config Introspection Endpoints

Validate loaded configuration at runtime:

```bash
curl -s "http://localhost:3001/config/recommendations?pretty=1"
curl -s "http://localhost:3001/config/next-actions?pretty=1"
curl -s "http://localhost:3001/techdb/taxonomy?pretty=1"
```

---

## Guardrails & Security

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

- After modifying configuration:
  - restart the backend
  - or run `npm run smoke` to validate

- If the dataset folder is empty, ensure submodules are initialized:

  ```bash
  git submodule update --init --recursive
  ```

---

## Summary

This backend transforms raw technology detection into **actionable HubSpot intelligence**.

It helps teams understand:

- what a company already uses
- what that implies about their maturity
- how HubSpot should be positioned
- what concrete next steps to recommend
