# Next Actions System

Next actions are short, client-ready “what to do next” items.

They are derived from recommendations and configured via:

`data/alternatives/inbox-next-actions.json`

## Config format

```json
{
  "version": 1,
  "max": 5,
  "rules": [
    {
      "when": { "productsAny": ["Marketing Hub"] },
      "actions": [
        {
          "title": "Attribution & reporting workshop",
          "priority": "high",
          "relatedProducts": ["Marketing Hub"],
          "why": "Align lifecycle stages and build CRM-connected reporting."
        }
      ]
    }
  ],
  "always": [
    {
      "title": "Stack consolidation roadmap",
      "priority": "low",
      "relatedProducts": ["Marketing Hub", "Content Hub"],
      "why": "Identify overlap and define a phased consolidation plan."
    }
  ]
}
```

## Triggering logic

- Build a set of HubSpot products present in recommendations.
- For each rule:

  - if any rule.product matches, add its actions.

- Add `always` actions.
- Deduplicate by title.
- Sort high → medium → low.
- Return up to `max`.

## Editing next actions

This is designed for non-developers:

- update text, priority, titles freely
- keep titles unique (dedupe uses title)
- run:

  - `GET /config/next-actions?pretty=1`
  - `npm run smoke`

## Best practices

- Keep next actions short and workshop-like.
- Use “why” to explain business impact.
- Align with Inbox’s actual service offerings and deliverables.

---

### [← 07 Recommendations](07-RECOMMENDATIONS.md) | **08 Next Actions** | [09 Security Guardrails →](09-SECURITY-GUARDRAILS.md)
