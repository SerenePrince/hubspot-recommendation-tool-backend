# Client Report Guide

This document maps the backend implementation to the sections of the submitted
technical report.

It exists to help reviewers and maintainers understand how the codebase reflects
the report’s structure.

---

## Pipeline Mapping

| Report Section | Implementation |
|---------------|----------------|
| Dataset Loading | `src/core/techdb` |
| Page Fetching | `src/core/fetch` |
| Signal Normalization | `src/core/normalize` |
| Technology Detection | `src/core/detect` |
| Recommendation Logic | `src/core/report` |

---

## Naming Alignment

Key report-aligned names include:

- `analyzeUrl`
- `detectTechnologies`
- `loadTechDb`
- `buildRecommendations`
- `buildCleanReport`

These names should be preserved.

---

## Data Flow Alignment

The report describes a linear flow. The code mirrors this:

1. URL input
2. Fetch
3. Normalize
4. Detect
5. Recommend
6. Output

---

## Determinism

The report emphasizes reproducibility. The backend enforces this via:

- Static dataset loading
- Explicit thresholds
- Stable sorting
- Defensive resolution rules

---

## Review Guidance

When reviewing the code against the report:

- Focus on structure, not syntax
- Verify phase alignment
- Confirm terminology consistency

---

## Final Note

This repository is intentionally conservative in its structure to preserve
traceability between implementation and documentation.

## API Output (Frontend)

When using the API (`GET /analyze`), the response is designed for direct UI rendering:

- `summary.topRecommendations` provides the top items for a “Recommended HubSpot Products” panel.
- `technologies[].hubspot.primaryProduct` is the primary replacement (if available).
- `technologies[].hubspot.products` is ordered primary-first.
- `recommendations[].triggeredBySummary` can be displayed as “Why am I seeing this?” helper text.
- `summary.totals.mappedReplacements` helps explain why some technologies may not have a mapped replacement yet.

See `05-API.md` for the full response schema.
