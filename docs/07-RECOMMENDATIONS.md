# Recommendation Logic

This document explains how HubSpot product recommendations are generated from
detected technologies.

---

## Overview

Recommendations are produced by mapping detected technologies, categories, and
groups to predefined HubSpot product suggestions.

The mapping logic is intentionally explicit and deterministic.

---

## Mapping File

Location:

```text
data/alternatives/hubspot-mapping.json
````

The mapping file is loaded at runtime and validated before use.

---

## Mapping Sections

The mapping file may contain the following sections:

### `byTechnology`

Recommendations triggered by a specific technology.

Example:

```json
{
  "React": [
    {
      "title": "HubSpot CMS Hub",
      "hubspotProduct": "CMS Hub",
      "priority": "high"
    }
  ]
}
```

---

### `byCategory` / `byCategoryId`

Triggered by technology categories.

---

### `byGroup` / `byGroupId`

Triggered by technology groups.

---

## Trigger Priority

Trigger specificity (highest to lowest):

1. Technology
2. Category / Category ID
3. Group / Group ID

More specific triggers contribute higher relevance.

---

## Confidence Threshold

Only technologies with confidence **≥ 50** are considered when generating
recommendations (report-aligned).

---

## Deduplication

Recommendations are deduplicated by:

* `title`
* `hubspotProduct`

Triggered-by metadata is merged.

---

## Sorting

Recommendations are sorted by:

1. Priority (`high` → `medium` → `low`)
2. Number of triggering signals
3. Title (alphabetical)

---

## Noise Reduction

To prevent excessive recommendations:

* Only the strongest group-level recommendation per HubSpot product is retained

---

## Output Fields

Each recommendation includes:

* title
* hubspotProduct
* priority
* description (optional)
* url (optional)
* tags (optional)
* triggeredBy (explanation of why it appeared)

---

## Related Documents

* `03-DATASET.md`
* `05-API.md`
* `12-CLIENT-REPORT-GUIDE.md`
