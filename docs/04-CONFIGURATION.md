# Configuration

This document describes the configuration options supported by the backend.

All configuration is provided via **environment variables**.

---

## Required Configuration

### `DATA_ROOT`

Path to the vendor technology dataset.

Example:
```bash
DATA_ROOT=./data/vendor/webappanalyzer/src
````

This directory must contain:

* `categories.json`
* `groups.json`
* `technologies/_.json`
* `technologies/a.json`–`z.json`

---

## Server Configuration

### `PORT`

HTTP port to bind the API server.

Default:

```text
3001
```

---

## Fetch Safety Limits

### `FETCH_TIMEOUT_MS`

Maximum time allowed for page fetching (including redirects).

Default:

```text
12000
```

---

### `MAX_FETCH_BYTES`

Maximum size (in bytes) for the primary HTML document.

Default:

```text
2000000
```

---

## Optional Configuration

### `NODE_ENV`

Runtime environment.

Common values:

* `development`
* `production`

---

### `REQUEST_LOG`

Enable structured request logging.

Values:

* `true` / `1` – enable
* `false` / `0` – disable (default)

---

### `CORS_ALLOW_ORIGIN`

Allowed CORS origin.

Default:

```text
*
```

---

## Validation

Before starting the service, run:

```bash
npm run validate-config
```

This validates:

* Environment variable types
* Dataset structure
* Required files

---

## Configuration Philosophy

* Safe defaults
* Explicit limits
* Fail fast on misconfiguration

---

## Related Documents

* `01-QUICKSTART.md`
* `09-DEPLOYMENT.md`
* `10-TROUBLESHOOTING.md`

```

---

### Next batch (still small docs)

Next logical set:

- `docs/05-API.md`
- `docs/06-CLI.md`
- `docs/07-RECOMMENDATIONS.md`

Say **continue** and I’ll finalize all three in one pass.
```
