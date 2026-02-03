# Troubleshooting

This document covers common issues and their resolutions.

---

## Service Will Not Start

### Symptoms
- Immediate exit on startup
- Errors referencing dataset files

### Resolution
```bash
npm run validate-config
````

Verify:

* DATA_ROOT path
* Presence of _.json and a–z.json
* Valid JSON files

---

## `/analyze` Returns Errors

### Common Causes

* Invalid URL
* Target site blocked by SSRF rules
* Timeout or size limit exceeded

### Resolution

* Check error message
* Try CLI mode:

  ```bash
  node src/cli/index.js <url> --pretty
  ```

---

## No Technologies Detected

### Possible Reasons

* Minimal/static site
* Uncommon technology stack
* Non-HTML response

### Resolution

* Confirm content-type
* Use `includeMeta=1` for debug data
* Validate vendor dataset

---

## Incorrect Recommendations

### Possible Reasons

* Mapping file does not include the technology/category
* Confidence threshold not met

### Resolution

* Inspect `triggeredBy` fields
* Review `hubspot-mapping.json`

---

## Docker Issues

### Container exits immediately

* Check logs:

  ```bash
  docker logs <container>
  ```

* Validate configuration inside container

---

## Still Stuck?

* Run smoke test:

  ```bash
  npm run smoke
  ```
* Review `RUNBOOK.md`
