# Docker Guide

## Overview

This guide explains how to run and deploy the HubSpot Recommendation Tool Backend using Docker.

The Docker setup aims for:
- predictable runtime behavior
- clear configuration via environment variables
- easy troubleshooting (logs to stdout, simple health check)

---

## Quick Start (Docker Compose)

Prerequisites:
- Docker 20.10+
- Docker Compose v2

```bash
docker compose build
docker compose up -d
docker compose ps
curl http://localhost:3001/health
docker compose logs -f backend
````

---

## Quick Start (Docker CLI)

```bash
docker build -t hubspot-backend .
docker run -d --name hubspot-backend -p 3001:3001 hubspot-backend
curl http://localhost:3001/health
```

---

## Configuration in Docker

The container uses the same environment variables as local mode. The important ones:

* `PORT` (default 3001)
* `DATA_ROOT` (path to vendored dataset inside container)
* `FETCH_TIMEOUT_MS`
* `MAX_FETCH_BYTES`

Recommended container values:

```bash
PORT=3001
DATA_ROOT=/app/data/vendor/webappanalyzer/src
FETCH_TIMEOUT_MS=12000
MAX_FETCH_BYTES=2000000
```

---

## Health Check

The service exposes:

```http
GET /health
```

Expected:

```json
{ "ok": true }
```

This is used by Docker Compose health checks and should be used by orchestration platforms.

---

## Common Docker Troubleshooting

### View logs

```bash
docker logs hubspot-backend
```

### Exec into the container

```bash
docker exec -it hubspot-backend sh
```

### Verify the dataset path exists

```bash
docker exec hubspot-backend ls -la /app/data/vendor/webappanalyzer/src
```

### Test the analyzer

```bash
curl "http://localhost:3001/analyze?url=https://react.dev&pretty=1"
```

---

## Kubernetes Notes (Optional)

This service is stateless and can be horizontally scaled.

Minimum recommended probes:

* liveness: `GET /health`
* readiness: `GET /health`

Ensure `DATA_ROOT` is correct inside the container image (default `/app/data/vendor/webappanalyzer/src`).
