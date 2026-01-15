# Overview

This project is a **surface-level technology detection** service (Wappalyzer-style), extended with:

- **HubSpot-focused recommendations** (Inbox Communications use-case)
- **Inbox-style “Next Actions”** suitable for audits and marketing plans
- Dual execution modes:
  - **API server** for future frontend + integrations
  - **CLI** for internal usage without needing to run a web app

## What it does (high level)

Given a URL:

1. Fetch a single page (HTML + response headers) safely.
2. Extract “signals” (headers, script src, meta tags, DOM selectors, inline scripts, etc).
3. Pattern-match signals against a fingerprint database (WebAppAnalyzer / Webappalyzer-style JSON).
4. Enrich each detection with categories and groups.
5. Generate **recommendations** based on configurable mapping files.
6. Generate **next actions** based on configurable rules.

## What it does NOT do

This is **not** a recon tool:

- No crawling
- No scanning multiple pages
- No brute forcing paths
- No bypassing logins
- No private network access

It only analyzes what is:

- Publicly visible in the returned HTML
- Publicly visible response headers
- Publicly visible URLs/scripts referenced by the page itself

## Key deliverable outputs

- A list of detected technologies with:

  - name
  - confidence
  - version (if captured via regex groups)
  - evidence (optional)
  - categories and groups

- Recommendations:

  - prioritized suggestions (high / medium / low)
  - the HubSpot product(s) aligned to the opportunity
  - “triggered by” list showing which detections led to the recommendation

- Next Actions:
  - a short, client-ready list of implementation steps (Inbox-style)
  - derived from recommendations, or configured via JSON rules

## Who this is for

- Inbox Communications / HubSpot partners: to quickly understand surface tech stack
- Internal implementation teams: to start audits faster
- Sales/marketing strategy: to identify consolidation opportunities

---

### [🏠 Index](../README.md) | **00 Overview** | [01 Quickstart →](01-QUICKSTART.md)
