---
description: Costs we paid that were never charged to the customer
---

Costs we paid that were never charged to the customer. Total them. For open jobs, propose the revenue line with /add-charge; for closed jobs, say what it cost and leave it.

Run: `node scripts/forwarding.mjs margin-leaks` with optional --since=YYYY-MM-DD. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
