# Recommendations System

Recommendations are generated from detections using a mapping file:

`data/alternatives/hubspot-mapping.json`

## What recommendations are

A recommendation is a suggestion tied to:

- a detected technology (e.g. Google Analytics)
- a detected category (e.g. Analytics)
- a detected group (e.g. Analytics group)

Each recommendation includes:

- `title` (human readable)
- `hubspotProduct` (e.g., Marketing Hub)
- `priority` (high|medium|low)
- `reason` (why this is recommended)
- `inboxOffer` (optional: what Inbox would deliver)

## Mapping format

Top-level sections (any can be present):

- `byTechnology`: { [techName]: RecommendationItem[] }
- `byCategoryId`: { [categoryId]: RecommendationItem[] }
- `byCategory`: { [categoryName]: RecommendationItem[] }
- `byGroupId`: { [groupId]: RecommendationItem[] }
- `byGroup`: { [groupName]: RecommendationItem[] }

Example:

```json
{
  "byTechnology": {
    "Google Analytics": [
      {
        "title": "Unify reporting & attribution in HubSpot",
        "hubspotProduct": "Marketing Hub",
        "priority": "medium",
        "reason": "Closed-loop reporting tied to CRM lifecycle stages.",
        "inboxOffer": "Custom attribution systems"
      }
    ]
  },
  "byCategoryId": {
    "10": [
      {
        "title": "Implement HubSpot-first analytics + attribution",
        "hubspotProduct": "Marketing Hub",
        "priority": "medium",
        "reason": "Analytics category detected."
      }
    ]
  },
  "byGroupId": {
    "8": [
      {
        "title": "Build HubSpot-first reporting and attribution",
        "hubspotProduct": "Marketing Hub",
        "priority": "medium",
        "reason": "Analytics group detected."
      }
    ]
  }
}
```

## How triggers work

During analysis, for each detection `d`:

1. tech rules:

   - `byTechnology[d.name]`

2. categories:

   - for each category in `d.categories`:

     - `byCategoryId[category.id]`
     - `byCategory[category.name]`

3. groups:

   - for each group in `d.groups`:

     - `byGroupId[group.id]`
     - `byGroup[group.name]`

## Deduping + ranking

The recommender merges duplicates and returns a small set:

- dedupe by `title + hubspotProduct`
- merge “triggeredBy” sources
- sort by:

  - priority (high > medium > low)
  - specificity (technology triggers often rank higher)
  - how many detections triggered it

- cap total count (default 8)
- optional “per HubSpot product” consolidation (to avoid spam)

## Adding new recommendations (workflow)

1. Decide what should trigger:

   - specific technology: best for competitor swaps
   - category: broad but useful
   - group: broadest (use sparingly)

2. Find the exact name/id:

   - Run taxonomy:

     - `npm run cli:tax`

   - Or inspect a report’s detections.

3. Add to mapping JSON:

   - keep titles action-oriented
   - keep reasons short and concrete
   - set priority realistically:

     - high: strong consolidation opportunity (CMS/CRM migrations)
     - medium: improvement opportunity (analytics attribution)
     - low: hygiene/optimization

4. Validate:

   - `GET /config/recommendations?pretty=1`
   - `npm run smoke`

## Common patterns Inbox will use

- CMS detected → recommend Content Hub + migration
- Analytics detected → recommend Marketing Hub + attribution workshop
- CRM detected → recommend CRM/Sales Hub + migration/RevOps audit
- Live chat/support detected → recommend Service Hub + ticketing/chat setup

---

### [← 06 CLI](06-CLI.md) | **07 Recommendations** | [08 Next Actions →](08-NEXT-ACTIONS.md)
