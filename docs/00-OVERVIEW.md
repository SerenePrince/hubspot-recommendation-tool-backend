# System Overview

The **HubSpot Recommendation Tool – Backend** is a stateless analysis service that
examines a target website and produces structured HubSpot product recommendations.

This document provides a high-level overview of the system’s purpose, scope, and
design philosophy. Detailed technical implementation is covered in subsequent
documents.

---

## Purpose

The backend exists to:

- Detect technologies used by a target website
- Categorize detected technologies into functional groups
- Generate actionable HubSpot product recommendations
- Expose results via a stable HTTP API and CLI

The service is designed to support **frontend visualization**, **technical reporting**,
and **repeatable analysis**.

---

## Core Responsibilities

The backend performs five primary responsibilities, executed as a single pipeline:

1. **Technology Database Loading**  
   Load and cache a vendor-provided technology dataset at startup.

2. **Safe Page Fetching**  
   Retrieve the target page while enforcing:
   - SSRF protection
   - Size limits
   - Redirect limits
   - Timeouts

3. **Signal Normalization**  
   Extract and normalize signals from the fetched page, including:
   - Headers
   - Cookies
   - HTML
   - Scripts and stylesheets
   - Metadata and DOM structure

4. **Technology Detection**  
   Match normalized signals against known technology patterns and resolve:
   - Confidence thresholds
   - Required dependencies
   - Implied technologies
   - Mutual exclusions

5. **Recommendation Generation**  
   Map detected technologies, categories, and groups to HubSpot product
   recommendations using a predefined mapping file.

---

## Inputs and Outputs

### Input
- A single URL (HTTP or HTTPS)

### Output
A structured JSON report containing:
- Detected technologies with confidence levels
- Grouped technology summaries
- HubSpot product recommendations
- Optional fetch and timing metadata

---

## Design Principles

### Deterministic
Given the same input URL and dataset, the backend produces the same output.

### Stateless
The service maintains no persistent runtime state beyond in-memory caching of
static datasets.

### Defensive
All external inputs (URLs, fetched content, vendor data) are treated as untrusted
and processed with explicit limits.

### Report-Aligned
Function names, directory layout, and pipeline phases are intentionally aligned
with the submitted technical report and should not be refactored casually.

---

## Non-Goals

The backend explicitly does **not**:

- Crawl multiple pages or sites
- Perform authentication or user management
- Store analysis results
- Provide real-time streaming updates

These responsibilities are out of scope by design.

---

## Related Documents

- `01-QUICKSTART.md` – Getting started quickly
- `02-ARCHITECTURE.md` – Detailed backend architecture
- `05-API.md` – HTTP API reference
- `07-RECOMMENDATIONS.md` – Recommendation logic
- `12-CLIENT-REPORT-GUIDE.md` – Mapping implementation to report sections
