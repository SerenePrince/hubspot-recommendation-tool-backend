# Contributing

## Principles

- Keep it surface-level (no recon)
- Prefer configuration over code changes
- Keep defaults safe
- Prefer readable mapping keys (names), but support IDs for stability

## Working with the vendor dataset

The fingerprint dataset in `data/vendor/webappanalyzer` is a **third-party Git
submodule**.

- Do not edit files inside the submodule directly
- If the dataset needs changes, update the submodule reference or use a forked upstream
- Local modifications inside the submodule will not be committed unless explicitly intended

If the dataset appears empty, initialize submodules:

```bash
git submodule update --init --recursive
```

## Adding a new detection signal type

1. Add to `buildSignals()`
2. Add to detector matching
3. Add evidence types in report formatting
4. Add a small smoke test

## Adding new recommendation logic

Prefer updating `hubspot-mapping.json` first.
Only change JS when:

- you need a new trigger type
- you need better dedupe/scoring behavior

## Coding style

- small files
- clear function boundaries
- avoid logging raw HTML

---

### [← 11 Troubleshooting](11-TROUBLESHOOTING.md) | **12 Contributing** | [13 Client Report Guide →](13-CLIENT-REPORT-GUIDE.md)
