# Security Guardrails

This document outlines the security controls and guardrails built into the backend.

The system is designed to analyze **untrusted URLs** safely and deterministically.

---

## Threat Model

Primary threats considered:

- Server-Side Request Forgery (SSRF)
- Resource exhaustion (memory, CPU, bandwidth)
- Malicious or malformed vendor data
- Unexpected input formats

The backend does not process authentication credentials or user data.

---

## URL Validation

Only the following URL schemes are allowed:

- `http://`
- `https://`

All other schemes are rejected.

---

## SSRF Protection

The fetch layer explicitly blocks:

- Loopback addresses (`127.0.0.0/8`)
- Link-local addresses
- Private IP ranges
- IPv6 local addresses

Redirects are validated at each hop.

---

## Resource Limits

Hard limits are enforced:

- **Fetch timeout** (default: 12s)
- **Max HTML size** (default: 2 MB)
- **Redirect limit** (fixed)
- **DOM parsing bounds**

These prevent runaway memory or CPU usage.

---

## Input Sanitization

- Headers, cookies, and DOM data are normalized
- Regular expressions are compiled defensively
- Invalid vendor patterns fail closed

---

## Dependency Surface

- Minimal runtime dependencies
- No dynamic code execution
- Vendor dataset treated as untrusted input

---

## Docker Security

When run via Docker:

- Non-root user
- Read-only filesystem
- Dropped Linux capabilities
- tmpfs used for temporary files

---

## Summary

The backend is designed to be **safe by default** when exposed to untrusted input,
even in public-facing environments.
