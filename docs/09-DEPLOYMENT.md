# Deployment

This document describes recommended deployment practices for the backend service.

---

## Supported Environments

- Local Node.js
- Docker
- Container orchestration platforms (Kubernetes-compatible)

---

## Docker Deployment (Recommended)

### Build

```bash
docker compose build
````

---

### Run

```bash
docker compose up
```

The service will be available on port `3001`.

---

## Environment Variables

At minimum:

```bash
DATA_ROOT=/app/data/vendor/webappanalyzer/src
PORT=3001
NODE_ENV=production
```

---

## Health Checks

Use:

```http
GET /health
```

This endpoint should be used by load balancers and orchestrators.

---

## Scaling

* The service is **stateless**
* Horizontal scaling is supported
* No sticky sessions required

---

## Observability

* Logs are written to stdout
* Docker log rotation is configured
* Timing metadata is available via `includeMeta=1`

---

## Rollout Strategy

Recommended:

1. Validate config
2. Run smoke test
3. Deploy new version
4. Monitor health endpoint

---

## Rollback

Rollback is safe because:

* No persistent data
* No migrations
* Deterministic behavior

---

## Related Documents

* `08-SECURITY-GUARDRAILS.md`
* `10-TROUBLESHOOTING.md`
