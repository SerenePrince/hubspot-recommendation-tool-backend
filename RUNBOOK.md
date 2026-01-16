# Inbox Operations Runbook

This runbook covers common operational and maintenance tasks
for the HubSpot Technology Intelligence Platform backend.

---

## Common Tasks

### Refresh Fingerprint Dataset

Update the vendor fingerprint dataset using your internal sync or update script:

```

data/vendor/webappanalyzer

```

After updating:

- restart the backend
- or redeploy the container

---

### Update Recommendations & Next Actions

Edit the client-owned configuration files:

- `data/alternatives/hubspot-mapping.json`
- `data/alternatives/inbox-next-actions.json`

Validate the configuration at runtime:

```bash
curl -s "http://localhost:3001/config/recommendations?pretty=1"
curl -s "http://localhost:3001/config/next-actions?pretty=1"
```

If validation fails:

- check JSON syntax
- check category/group IDs
- restart the backend

---

### Verify System Health

Run smoke tests:

```bash
npm run smoke
npm run smoke -- https://react.dev/
```

Check API health:

```bash
curl -s http://localhost:3001/health
```

---

## Production (Docker)

### Build Image

```bash
docker build -t hubspot-intel-backend ./backend
```

### Run Container

```bash
docker run --rm -p 3001:3001 \
  -e DATA_ROOT=/data/vendor/webappanalyzer/src \
  -v "$(pwd)/data:/data" \
  hubspot-intel-backend
```

---

## When Things Look Wrong

1. Check `.env` values
2. Verify dataset path (`DATA_ROOT`)
3. Run `npm run smoke`
4. Validate config endpoints:
   - `/config/recommendations`
   - `/config/next-actions`
   - `/techdb/taxonomy`

5. Restart backend

---

## Operational Notes

- This system is **intentionally non-invasive**
- It does not crawl or scan
- Failures usually indicate:
  - dataset path issues
  - malformed config JSON
  - network fetch timeouts
