# Deployment

## Local (systemd / PM2 optional)

- Run:
  - `npm start`
- Set `.env`
- Use reverse proxy (nginx) if exposing publicly

> Ensure Git submodules are initialized before starting the service:
>
> ```bash
> git submodule update --init --recursive
> ```

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

> The `data/vendor/webappanalyzer` directory is provided via a Git submodule and must be present on the host before starting the container.

## Recommended deployment pattern

- Keep `data/` on host
- Initialize and update the vendor dataset via Git submodule
- Restart the container or service after dataset updates

To update the dataset:

```bash
cd data/vendor/webappanalyzer
git pull
cd ../../..
```

---

### [← 09 Security Guardrails](09-SECURITY-GUARDRAILS.md) | **10 Deployment** | [11 Troubleshooting →](11-TROUBLESHOOTING.md)
