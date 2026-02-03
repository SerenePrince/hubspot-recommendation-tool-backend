# Dataset

This backend relies on a vendored technology dataset derived from the
WebAppAnalyzer / Wappalyzer project.

---

## Dataset Location

```text
data/vendor/webappanalyzer/src/
````

Key files:

* `categories.json`
* `groups.json`
* `technologies/_.json`
* `technologies/a.json` – `technologies/z.json`

---

## Technology Files

Technology definitions are split alphabetically by **technology name**:

* `_.json` – technologies starting with numbers or symbols
* `a.json`–`z.json` – technologies starting with letters

Each file contains a JSON object mapping technology names to definitions.

---

## Technology Definition Structure

A technology definition may include:

* Detection patterns:

  * `headers`
  * `cookies`
  * `meta`
  * `html`
  * `text`
  * `scriptSrc`
  * `scripts`
  * `css`
  * `dom`
  * `url`
* Resolution rules:

  * `requires`
  * `implies`
  * `excludes`
* Metadata:

  * `cats` (category IDs)
  * `website`
  * `description`
  * `icon`

Not all fields are required.

---

## Vendor Ownership

* The dataset is **vendored**, not authored by this project
* Files should not be modified unless explicitly updating the dataset
* License information is preserved in the vendor directory

---

## Loading Behavior

* Dataset is loaded at startup
* Parsed once and cached in memory
* Missing or malformed files cause startup failure

This ensures predictable behavior in production.

---

## Related Documents

* `02-ARCHITECTURE.md`
* `07-RECOMMENDATIONS.md`
* `12-CLIENT-REPORT-GUIDE.md`
