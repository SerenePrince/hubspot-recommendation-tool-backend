# CLI

The CLI lets you run analysis without starting the API.

## Analyze a URL

```bash
npm run cli -- https://react.dev/
```

## Show more evidence

If you implemented a flag like `--all-evidence`:

```bash
npm run cli -- https://react.dev/ --all-evidence
```

## Print taxonomy

```bash
npm run cli:tax
```

This is helpful for mapping authors:

- category IDs/names
- group IDs/names

## Smoke test

```bash
npm run smoke
npm run smoke -- https://react.dev/
```

---

### [← 05 API](05-API.md) | **06 CLI** | [07 Recommendations →](07-RECOMMENDATIONS.md)
