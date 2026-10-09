---
description: Jobs, TEU, revenue, profit and margin by customer
---

Jobs, TEU, revenue, profit and margin by customer. Lead with the customers under the margin floor. Profit per job is the number to compare.

Run: `node scripts/forwarding.mjs customer-profit` with optional --since=YYYY-MM-DD. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
