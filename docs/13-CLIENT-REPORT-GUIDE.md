# Client Report Guide

How to read your “Website Technology & HubSpot Opportunities” report

This report is designed to give a **surface-level** view of technologies that appear publicly on a website (based on the HTML and response headers returned when the page is loaded). It helps identify:

- what tools are likely in use
- what categories those tools belong to (analytics, CMS, forms, etc.)
- opportunities to simplify or consolidate tools into HubSpot

> Important: This is **not a security scan** and does not attempt to access private systems, hidden pages, or logged-in areas.

---

## 1) What this report is (and isn’t)

### What it is

A “best-effort” technology identification report based on:

- publicly returned page HTML
- publicly returned response headers
- publicly referenced scripts/assets (e.g., script URLs)

### What it is not

This report does **not**:

- crawl the site
- scan thousands of URLs
- brute-force endpoints
- bypass logins or paywalls
- look inside private/admin areas
- attempt to identify vulnerabilities

It only uses what’s available from a standard page load.

---

## 2) Sections you’ll see

### A) Fetch Summary

This explains what was successfully retrieved:

- **Status** (example: 200 OK)
- **Content type** (example: HTML)
- **Bytes** (size of response)
- **Timing** (how long the fetch took)
- **Selected headers** (e.g., server, caching, CDN info)

Why it matters:

- Confirms the page was reachable and returned content
- Helps explain why some detections might be missing (blocked/redirects/etc.)

---

### B) Detections

This is the list of technologies we believe are present.

Each detection includes:

#### 1) Technology name

Example: “Google Tag Manager”, “WordPress”, “Vercel”

#### 2) Confidence score (0–100)

Confidence represents how strongly the public signals matched known fingerprints.

A practical guide:

- **90–100**: strong match (very likely correct)
- **70–89**: likely, but could be shared by similar tools
- **< 70**: low confidence (informational; usually not used for recommendations)

#### 3) Categories and Groups

Technologies are organized to improve readability.

Example:

- Group: **Analytics**
- Category: **Tag managers**
- Technology: **Google Tag Manager**

Why it matters:

- Categories/groups help summarize “what kinds of tools are present”
- Used to generate recommendations

#### 4) Evidence (optional)

Evidence is shown as “why we believe this was detected.”

Examples:

- A script URL matched a known pattern:
  - `scriptSrc matched /googletagmanager\.com/`
- A header value matched:
  - `header[server] matched /^Vercel$/`
- A DOM selector was present:
  - `dom selector "body > div" present`

Evidence is not sensitive data — it is taken from public page output.

> Some reports may hide evidence for readability or brevity.

---

### C) Recommendations (HubSpot Opportunities)

Recommendations are designed to highlight where HubSpot can:

- replace overlapping tools
- reduce “tool sprawl”
- improve reporting by connecting marketing → sales → service data

Each recommendation includes:

#### 1) Recommendation title

Example: “Unify reporting & attribution in HubSpot”

#### 2) Priority (high / medium / low)

A practical guide:

- **High**: strong consolidation opportunity or major impact
- **Medium**: meaningful improvement opportunity
- **Low**: optimization/hygiene opportunity

#### 3) HubSpot product(s)

Example:

- Marketing Hub
- Content Hub
- Sales Hub
- Service Hub
- CRM

#### 4) Triggered by

This tells you _what detections led to this suggestion_.

Example:

- Triggered by: Google Analytics, Google Tag Manager

Why it matters:

- Provides transparency
- Helps avoid “generic” recommendations by tying them to detected tools

---

### D) Next Actions

Next actions are a short list of “what we recommend doing next” in a practical consulting sense.

Examples:

- “Attribution & reporting workshop”
- “Tracking & tag governance audit”
- “Website & CMS migration assessment”
- “RevOps audit & lifecycle alignment”

These actions reflect common next steps that lead to:

- cleaner reporting
- better CRM adoption
- improved lead handling
- consolidated tooling

---

## 3) Why you might see duplicates

Sometimes the same platform can show up in multiple ways.

Example:

- WordPress might be detected from a script path **and** an HTML pattern.

This is normal. The report groups and merges signals where possible, but evidence may still show multiple sources.

---

## 4) Why some tools might be missing

Technology detection is limited by what’s publicly visible.

Common reasons something doesn’t show:

- the site renders most content in the browser (client-side apps)
- the tech is only visible after login
- the page blocks bots/unknown user agents
- the site is behind a WAF/CDN that hides headers
- patterns in the dataset don’t cover a niche tool yet

If a tool is missing but you know it exists, it can often be added to the mapping/fingerprint approach later.

---

## 5) How to use this report

This report is best used as a starting point for:

### Website and marketing stack audits

- identify overlapping tools
- find obvious consolidation opportunities

### Attribution and reporting alignment

- ensure marketing efforts connect to CRM outcomes
- reduce fragmented analytics

### CRM and RevOps planning

- check for signals of multi-system fragmentation
- plan for lifecycle stage alignment

### Support and service workflow assessment

- identify chat/ticketing systems that could unify into a single customer view

---

## 6) Key disclaimers

- This is an **informational report**, not a guarantee.
- Confidence scores represent likelihood based on public fingerprints.
- The report does not access private systems or hidden endpoints.

---

## 7) Questions to ask after reading the report

To get the most value from this report, consider:

1. Are there multiple tools serving the same purpose (analytics, forms, chat, email)?
2. Are we able to connect marketing activity to CRM outcomes cleanly?
3. Are sales and service teams operating in the same system of record?
4. Would consolidating onto HubSpot reduce operational overhead?
5. Which “Next Actions” would create the fastest measurable improvement?

---

## 8) Support

If you have questions about any detection or recommendation:

- share the report output
- confirm whether the tool is truly used site-wide or only on specific pages
- note whether important features are behind login (which won’t be visible to this detector)

---

### [← 12 Contributing](12-CONTRIBUTING.md) | **13 Client Report Guide** | [🏠 Index](../README.md)
