# Deployment

## Local (systemd / PM2 optional)

- Run:
  - `npm start`
- Set `.env`
- Use reverse proxy (nginx) if exposing publicly

## Docker

Build:

```bash
docker build -t hubspot-tool-backend ./backend
```

Run (mount data directory):

```bash
docker run --rm -p 3001:3001 \
  -e DATA_ROOT=/data/vendor/webappanalyzer/src \
  -e PORT=3001 \
  -v "$(pwd)/data:/data" \
  hubspot-tool-backend
```

## Recommended deployment pattern

- Keep `data/` on host
- Update vendor dataset on host via your clone script
- Restart container after updates

---

### [← 09 Security Guardrails](09-SECURITY-GUARDRAILS.md) | **10 Deployment** | [11 Troubleshooting →](11-TROUBLESHOOTING.md)
