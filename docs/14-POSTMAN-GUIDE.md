# Postman Guide

Using the HubSpot Recommendation Tool API

This guide explains how to use the Postman collection that ships with the project.

---

## 1. Importing the Collection

You should have two files:

- `HubSpot-Recommendation-Tool.postman_collection.json`
- `HubSpot-Recommendation-Tool.postman_environment.json`

### Step 1 — Open Postman

Click **Import** → drag both files in → click **Import**.

### Step 2 — Select Environment

In the top-right corner of Postman, select:

```

HubSpot Recommendation Tool (Local)

```

This sets:

| Variable     | Value                   |
| ------------ | ----------------------- |
| `baseUrl`    | `http://localhost:3001` |
| `exampleUrl` | `https://react.dev/`    |

You may change these at any time.

---

## 2. Understanding the Collection Structure

The collection is organized into folders:

| Folder                   | Purpose                      |
| ------------------------ | ---------------------------- |
| Health                   | Check server availability    |
| Analyze                  | Core technology detection    |
| TechDB                   | View loaded taxonomy         |
| Config – Recommendations | Inspect recommendation rules |
| Config – Next Actions    | Inspect next-actions rules   |

---

## 3. Core Request: Analyze

### Default Analyze

**Request**

```

POST {{baseUrl}}/analyze

```

**Body**

```json
{
  "url": "{{exampleUrl}}"
}
```

Returns the full analysis including:

- detections
- recommendations
- nextActions
- summary

---

### Analyze with Pretty Output

```
POST {{baseUrl}}/analyze?pretty=1
```

Formats JSON for easier reading.

---

### Hide Evidence (Client View)

```
POST {{baseUrl}}/analyze?includeEvidence=0
```

Removes all detection evidence from the response, leaving only:

- name
- confidence
- categories
- groups

Useful for client-facing reports.

---

### Show Signal Summaries (Debugging)

```
POST {{baseUrl}}/analyze?includeSignals=1
```

Adds safe debugging context:

- HTML meta keys
- script src preview
- cookie names

Raw HTML is never returned.

---

### Full Combination

```
POST {{baseUrl}}/analyze?pretty=1&includeEvidence=0&includeSignals=1
```

---

## 4. Error Handling Example

```
POST {{baseUrl}}/analyze?pretty=1
Body: {}
```

Returns:

```json
{
  "ok": false,
  "error": "Missing or invalid 'url' in request body"
}
```

---

## 5. Inspecting Configuration at Runtime

### Recommendation Mapping

```
GET {{baseUrl}}/config/recommendations
GET {{baseUrl}}/config/recommendations?pretty=1
GET {{baseUrl}}/config/recommendations?include=1
```

### Next Actions Rules

```
GET {{baseUrl}}/config/next-actions
GET {{baseUrl}}/config/next-actions?pretty=1
GET {{baseUrl}}/config/next-actions?include=1
```

### Technology Taxonomy

```
GET {{baseUrl}}/techdb/taxonomy
GET {{baseUrl}}/techdb/taxonomy?pretty=1
```

---

## 6. Typical Workflow in Postman

1. Start backend server
2. Select environment in Postman
3. Run **Health** request
4. Run **Analyze → Default**
5. Try different Analyze variations
6. Inspect configs
7. Export or save results

---

## 7. When Something Looks Wrong

If a detection or recommendation looks incorrect:

1. Run:

```
POST /analyze?includeSignals=1
```

2. Review signals
3. Check fingerprint dataset and mapping configs
4. Restart server after config changes

---

## 8. Best Practices

- Use `includeEvidence=0` for client demos
- Use `includeSignals=1` for debugging
- Never expose internal debug signals publicly
- Keep Postman environment values consistent with deployment target

````

---

## Optional (nice polish)
Add this to your main `README.md` under Documentation:

```md
- [Postman Usage Guide](docs/POSTMAN-GUIDE.md)
````
