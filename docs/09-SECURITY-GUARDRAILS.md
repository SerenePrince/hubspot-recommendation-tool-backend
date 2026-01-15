# Security & Guardrails

This project is intentionally limited to surface-level detection.

## SSRF / private network blocking

The fetch layer blocks:

- localhost
- loopback ranges
- private network ranges
- other unsafe targets (depending on your ssrf.js)

This prevents internal network probing.

## Limits

- timeout: `FETCH_TIMEOUT_MS`
- max response bytes: `MAX_FETCH_BYTES`

These protect against:

- slow responses
- huge payloads
- memory abuse

## No crawling

The analyzer performs:

- exactly one fetch per request
- it does not follow internal site maps
- it does not enumerate endpoints

## Evidence handling

- API can hide evidence: `includeEvidence=0`
- raw HTML is not returned
- “signals” output is safe summaries only (meta keys, script src preview, cookie names)

## Logging & privacy

Be careful about logging:

- do not log full HTML
- do not log cookies
- avoid storing PII

---

### [← 08 Next Actions](08-NEXT-ACTIONS.md) | **09 Security Guardrails** | [10 Deployment →](10-DEPLOYMENT.md)
