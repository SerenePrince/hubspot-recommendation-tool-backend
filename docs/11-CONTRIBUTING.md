# Contributing

This document describes contribution guidelines for the backend repository.

---

## Scope of Changes

Because this project is tied to a submitted technical report:

- **Function names**
- **Directory structure**
- **Pipeline phases**

should not be renamed or reorganized without revisiting the report.

---

## Allowed Changes

- Bug fixes
- Performance improvements
- Security hardening
- Documentation updates
- Dataset updates

---

## Code Style

- Clear, defensive JavaScript
- Explicit error handling
- Deterministic behavior
- No unnecessary abstractions

---

## Testing

Before submitting changes:

```bash
npm run validate-config
npm run smoke
````

---

## Vendor Data

* Vendor dataset is not authored here
* Preserve license and attribution
* Avoid modifying unless intentionally upgrading

---

## Pull Requests

* Keep changes focused
* Document reasoning clearly
* Avoid “drive-by refactors”

---

## Questions

If unsure whether a change affects report alignment, assume **yes** and proceed cautiously.
