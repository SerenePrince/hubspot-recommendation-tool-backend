# Architecture

This document describes the internal architecture of the HubSpot Recommendation Tool backend.

The architecture intentionally mirrors the structure and terminology used in the
submitted technical report.

---

## High-Level Architecture

The backend is organized as a **linear analysis pipeline**:

```text
URL
 ↓
[ Fetch ]
 ↓
[ Normalize Signals ]
 ↓
[ Detect Technologies ]
 ↓
[ Generate Recommendations ]
 ↓
JSON Report
````

Each stage is isolated, testable, and side-effect free.

---

## Core Modules

### `src/core/techdb`

Loads and caches the vendor technology dataset.

Responsibilities:

* Load category and group taxonomies
* Load technology definitions (`_.json`, `a.json`–`z.json`)
* Provide lookup structures for detection and enrichment

Loaded once and cached in memory.

---

### `src/core/fetch`

Responsible for retrieving external content safely.

Key features:

* SSRF protection (blocks private/loopback IPs)
* Redirect validation per hop
* Hard size limits
* Deadline-based timeouts

No persistent connections or retries are used.

---

### `src/core/normalize`

Transforms raw fetch results into normalized signals.

Signals include:

* Headers
* Cookies
* HTML
* Script sources
* CSS references
* Visible text
* DOM structure

Normalization reduces downstream complexity and enforces bounds.

---

### `src/core/detect`

Matches normalized signals against technology patterns.

Includes:

* Pattern compilation
* Multiple matchers (URL, headers, cookies, DOM, etc.)
* Confidence scoring
* Resolution of:

  * `requires`
  * `implies`
  * `excludes`

Detection is deterministic and order-stable.

---

### `src/core/report`

Transforms detections into consumable output.

Responsibilities:

* Enrich detections with taxonomy data
* Generate HubSpot recommendations
* Group detections
* Build summaries
* Produce clean API/CLI payloads

---

## API Layer

### `src/api`

Provides a minimal HTTP interface:

* `GET /health`
* `GET /analyze`

The API layer does not contain business logic; it delegates to the core pipeline.

---

## CLI Layer

### `src/cli`

Provides direct access to the pipeline without running the server.

Useful for:

* Development
* Debugging
* Validation
* Offline analysis

---

## Design Constraints

* **Stateless execution**
* **Deterministic output**
* **Report-aligned naming**
* **Defensive input handling**

These constraints are intentional and should be preserved.

---

## Related Documents

* `03-DATASET.md`
* `05-API.md`
* `07-RECOMMENDATIONS.md`
