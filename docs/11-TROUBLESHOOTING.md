# Troubleshooting

## “Blocked host: localhost / 127.0.0.1”

Expected behavior. SSRF guardrails block private hosts.

## “Failed to load tech DB”

Check:

- `DATA_ROOT` points to `.../webappanalyzer/src`
- categories.json exists
- groups.json exists
- technologies folder exists

Try:

```bash
ls "$DATA_ROOT"
```

```

## “Mapping invalid”

Check:

- JSON syntax errors
- required fields: title, hubspotProduct, priority
  Validate:
- `GET /config/recommendations?pretty=1`
- `npm run smoke`

## “Next actions config invalid”

Validate:

- `GET /config/next-actions?pretty=1`
- `npm run smoke`

## Detection seems too low

This is common if:

- site is heavily rendered client-side
- patterns depend on scripts not visible on first response
  Options:
- add DOM selector rules
- add HTML/text rules
- (optional future) fetch rendered HTML via headless browser — but that increases scope and must be carefully considered for “not recon” stance.
```

---

### [← 10 Deployment](10-DEPLOYMENT.md) | **11 Troubleshooting** | [12 Contributing →](12-CONTRIBUTING.md)
