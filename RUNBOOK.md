# Backend Runbook – HubSpot Recommendation Tool

This runbook describes how to operate, troubleshoot, and validate the backend service
in production environments.

---

## Service Overview

- **Service name:** HubSpot Recommendation Tool – Backend
- **Port:** 3001 (default)
- **Protocol:** HTTP
- **Stateless:** Yes
- **Persistent storage:** None (read-only vendor data)

---

## Health Check

### Endpoint

```http
GET /health
````

### Expected Response

```json
{
  "ok": true,
  "service": "HubSpot Recommendation Tool API"
}
```

If this endpoint does not return HTTP 200, the service should be considered unhealthy.

---

## Startup Checklist

Before deploying:

1. Verify Node version:

   ```bash
   node --version
   ```

   Must be **>= 24 < 25**

2. Validate configuration:

   ```bash
   npm run validate-config
   ```

3. (Optional) Run smoke test:

   ```bash
   npm run smoke
   ```

---

## Common Failure Modes

### 1. Service fails on startup

**Likely causes**

* Missing or invalid `DATA_ROOT`
* Corrupted vendor JSON
* Invalid environment variable values

**Action**

```bash
npm run validate-config
```

---

### 2. `/analyze` returns errors for valid URLs

**Likely causes**

* Target site blocked by SSRF rules
* Target site times out or exceeds size limits
* DNS resolution failure

**Action**

* Check error message returned by API
* Try the same URL via CLI:

  ```bash
  node src/cli/index.js https://example.com --pretty
  ```

---

### 3. No technologies detected

**Likely causes**

* Target site uses uncommon stack
* Vendor dataset is outdated
* Page is not HTML

**Action**

* Confirm response `content-type`
* Inspect `includeMeta=1` output
* Validate vendor dataset integrity

---

## Logs

The service logs to **stdout** in structured JSON (request logs optional).

In Docker:

```bash
docker logs <container>
```

---

## Resource Limits

Default limits (can be overridden via env vars):

* Fetch timeout: **12 seconds**
* Max HTML bytes: **2 MB**
* External resource fetches: bounded and capped
* Redirect limit: **5**

These limits protect the service from abuse and runaway memory usage.

---

## Shutdown Behavior

* Responds to `SIGTERM` and `SIGINT`
* Graceful HTTP shutdown
* Forced exit after 10 seconds if hung

This makes the service safe for orchestration systems (Docker, Kubernetes).

---

## Security Notes

* SSRF protections block private, loopback, and link-local addresses
* Only `http://` and `https://` URLs are allowed
* No credentials or secrets are required at runtime
* Service runs as **non-root** in Docker

---

## Escalation

If the service repeatedly fails validation or detection accuracy degrades:

1. Verify the vendor dataset has not changed format
2. Re-run `npm run smoke`
3. Revisit `docs/10-TROUBLESHOOTING.md`
