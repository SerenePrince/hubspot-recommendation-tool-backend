# Backend Testing Guide

This backend uses **Jest** for unit testing. The unit tests are designed to validate the core analysis pipeline and reporting logic in a deterministic, isolated way (no real network calls, no real databases).

## What these tests cover

The test suite is organized around the application pipeline:

- **Phase 1 – Technology DB loading**
  - Validates expected DB files exist
  - Validates parsing, error paths, and deterministic indexes/caching

- **Phase 2 – Fetching and SSRF protections**
  - Validates URL validation rules (block private IPs, local hostnames, etc.)
  - Validates DNS-resolution restrictions where applicable

- **Phase 3 – Signal normalization**
  - Validates extraction + normalization of headers, cookies, scripts, meta tags
  - Validates caps / noise limits and consistent behavior for edge cases

- **Phase 4 – Technology detection**
  - Validates confidence aggregation and version selection rules
  - Validates ordering/threshold behavior and defensive matcher errors

- **Phase 5 – Report + recommendations**
  - Validates mapping validation + fallback behavior
  - Validates merge rules for duplicate recommendations
  - Validates scoring/sorting determinism and noise caps

## Running tests

Install dependencies:

```bash
npm install
````

Run the full unit test suite:

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

Coverage:

```bash
npm run test:coverage
```

## Test philosophy & standards

* **Unit tests are isolated**: external systems should be mocked (filesystem, HTTP, DNS, timers).
* **No real network calls**: tests must remain deterministic and safe to run in any environment.
* **Readable and maintainable**:

  * Test names describe behavior
  * Arrange/Act/Assert structure
  * Small helpers (factories) used for repeated shapes
* **Logs**:

  * Tests should not emit console logs unless explicitly tested.
  * If a test intentionally triggers `console.error` (e.g. invalid mapping fallback), it should mock `console.error` for that test only.

## Troubleshooting

* If tests fail on a new machine, confirm Node version matches `.nvmrc`.
* If a new feature requires network access, implement it behind an injectable interface and mock it in unit tests.
