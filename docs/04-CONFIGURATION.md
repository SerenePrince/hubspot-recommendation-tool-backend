# Configuration

Configuration is controlled by:

1. Environment variables (.env)
2. JSON config files under `data/alternatives/`

## Environment variables

### PORT

HTTP server port.
Default: 3001

### NODE_ENV

Standard Node environment flag.
Default: development

### DATA_ROOT

Path to vendor dataset src folder.
Default: `../data/vendor/webappanalyzer/src`

Example:

- Local: `../data/vendor/webappanalyzer/src`
- Docker: `/data/vendor/webappanalyzer/src`

### FETCH_TIMEOUT_MS

Maximum fetch time before abort.
Default: 12000

### MAX_FETCH_BYTES

Maximum response body size.
Default: 2000000

### REPORT_CACHE_TTL_MS

TTL for cached reports (ms).
Default: 300000 (5 minutes)

### REPORT_CACHE_MAX_ENTRIES

Max cached entries in memory.
Default: 200

## JSON config files

### hubspot-mapping.json

Location:
`data/alternatives/hubspot-mapping.json`

Controls recommendation rules.

### inbox-next-actions.json

Location:
`data/alternatives/inbox-next-actions.json`

Controls “next actions” list.

## Reload behavior

For MVP:

- config files are loaded when needed and may be cached
- restart server after significant config changes to be safe

(We can add “hot reload” later via file watchers if needed.)

---

### [← 03 Dataset](03-DATASET.md) | **04 Configuration** | [05 API →](05-API.md)
