# Vendor Dataset (WebAppAnalyzer / Wappalyzer-style)

This project uses a vendor dataset that provides technology definitions and detection patterns.

The dataset is maintained by a third party and is included in this repository as a **Git submodule**, pinned to a specific upstream commit for reproducibility.

## Expected folder structure

`DATA_ROOT` points to the dataset `src` folder:

```

DATA_ROOT/
categories.json
groups.json
technologies/
_.json
a.json
b.json
...
z.json

```

## What’s in the dataset

### categories.json

- Object keyed by category id
- Each category includes:
  - `name`
  - `groups` (list of group ids)

### groups.json

- Object keyed by group id
- Each group includes:
  - `name`

### technologies/\*.json

- Object keyed by technology name
- Each technology definition may contain:
  - pattern rules (headers, scripts, scriptSrc, meta, dom, html, text, url, cookies, etc.)
  - `cats` (category ids)
  - relationship rules:
    - `implies`
    - `excludes`
    - `requires` / `requiresCategory`

## How patterns work (simplified)

A technology might detect via:

- response headers (e.g., `server: Vercel`)
- script src (e.g., `googletagmanager.com/gtag/js`)
- DOM patterns (e.g., selector present)
- HTML regex (e.g., specific class patterns)

The detector:

1. extracts signals
2. tries patterns against those signals
3. records evidence
4. merges and post-processes results

## Updating the dataset

The dataset is managed as a Git submodule.

To update it to a newer upstream version:

```bash
cd data/vendor/webappanalyzer
git pull
cd ../../..
git add data/vendor/webappanalyzer
git commit -m "Update vendor dataset"
```

After updating:

- restart the backend server (or rerun CLI)
- optionally run `npm run smoke` to verify everything still loads

## Important note: stability of IDs

Categories and groups are keyed by IDs in JSON.
IDs are generally stable, but names are more human-friendly.

Your recommendation system supports both:

- categoryId/groupId (stable)
- category/group by name (readable)

See:

- `docs/07-RECOMMENDATIONS.md`

---

### [← 02 Architecture](02-ARCHITECTURE.md) | **03 Dataset** | [04 Configuration →](04-CONFIGURATION.md)
