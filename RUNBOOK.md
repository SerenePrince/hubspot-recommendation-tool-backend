# Inbox Operations Runbook

## Common Tasks

### Refresh Fingerprints

Update vendor dataset using your clone/update script:

```

data/vendor/webappanalyzer

```

Restart backend after update.

---

### Update Recommendations & Next Actions

Edit:

- `data/alternatives/hubspot-mapping.json`
- `data/alternatives/inbox-next-actions.json`

Validate:

```bash
curl -s "http://localhost:3001/config/recommendations?pretty=1"
curl -s "http://localhost:3001/config/next-actions?pretty=1"
```

---

### Verify System Health

```bash
npm run smoke
npm run smoke -- https://react.dev/
```

---

### Production (Docker)

Build:

```bash
docker build -t hubspot-tool-backend ./backend
```

Run:

```bash
docker run --rm -p 3001:3001 \
  -e DATA_ROOT=/data/vendor/webappanalyzer/src \
  -v "$(pwd)/data:/data" \
  hubspot-tool-backend
```

---

### When Things Look Wrong

- Check `.env` values
- Check dataset path: `DATA_ROOT`
- Re-run `npm run smoke`
- Validate configs using `/config/*` endpoints
