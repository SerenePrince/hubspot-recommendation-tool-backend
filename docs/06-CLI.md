# CLI Usage

The backend includes a command-line interface (CLI) for running analysis without
starting the HTTP server.

---

## Entry Point

```bash
node src/cli/index.js
````

---

## Basic Usage

```bash
node src/cli/index.js <url>
```

Example:

```bash
node src/cli/index.js https://example.com
```

---

## Flags

| Flag       | Description                              |
| ---------- | ---------------------------------------- |
| `--pretty` | Pretty-print JSON output                 |
| `--meta`   | Include fetch and timing metadata        |
| `--raw`    | Output the full internal analysis report |

---

## Examples

### Pretty-printed output

```bash
node src/cli/index.js https://react.dev --pretty
```

---

### Include metadata

```bash
node src/cli/index.js https://example.com --meta --pretty
```

---

### Raw internal report (debug)

```bash
node src/cli/index.js https://example.com --raw
```

---

## Taxonomy CLI

List all categories and groups in the dataset:

```bash
node src/cli/taxonomy.js --pretty
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
