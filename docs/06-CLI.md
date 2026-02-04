# CLI Usage

The backend includes a command-line interface (CLI) for running analysis without starting the HTTP server.

---

## Entry Point

```bash
npm run cli -- <url>
```

> You can also run `node src/cli/index.js` directly, but `npm run cli` is recommended for consistency across environments.


---

## Basic Usage

```bash
npm run cli -- <url>
```

Example:

```bash
npm run cli -- https://example.com
```

---

## Output Formats

By default the CLI prints **compact JSON** (good for piping into other tools).

| Flag | Description |
| --- | --- |
| `--format json` | Compact JSON (default) |
| `--format json-pretty` | Pretty-printed JSON (alias: `--format json-pretty  # (alias: --pretty)`) |
| `--format human` | Human-readable report (alias: `--format human  # (alias: --human)`) |

Examples:

```bash
npm run cli -- https://react.dev --format json-pretty
npm run cli -- https://react.dev --format human
```

---

## Human Output Options

These flags only apply when using `--format human` / `--format human  # (alias: --human)`.

| Flag | Description |
| --- | --- |
| `--wide` | Disable truncation/shrinking (may exceed terminal width) |
| `--wrap` | Wrap long cells to fit table width (taller output, no truncation) |
| `--max-width <n>` | Override the table width (defaults to terminal width, capped at 120) |
| `--inspect <technology>` | Show a detailed view for one detected technology (best with `--wide` or `--wrap`) |

Examples:

```bash
# Default (truncate long cells)
npm run cli -- https://example.com --format human  # (alias: --human)

# Show full values
npm run cli -- https://example.com --format human  # (alias: --human) --wide

# Wrap long values (no truncation)
npm run cli -- https://example.com --format human  # (alias: --human) --wrap

# Force width (useful in CI logs)
npm run cli -- https://example.com --format human  # (alias: --human) --max-width 90

# Focus a single technology
npm run cli -- https://example.com --format human  # (alias: --human) --inspect "WordPress" --wide
```

---

## Debug / Metadata Flags

| Flag | Description |
| --- | --- |
| `--meta` | Include fetch and timing metadata (default behavior for the “clean” report) |
| `--raw` | Output the full internal analysis report (debug) |

Examples:

```bash
npm run cli -- https://example.com --meta --format json-pretty
npm run cli -- https://example.com --raw --format json-pretty
```

---

## Taxonomy CLI

List all categories and groups in the dataset:

```bash
npm run cli:tax -- --format json-pretty  # (alias: --pretty)
```

---

## Use Cases

* Local development
* Dataset validation
* Debugging detection rules
* Offline analysis

---

## Related Documents

* `05-API.md`
* `03-DATASET.md`
