---
description: Delivered jobs with revenue not invoiced, oldest first
---

Delivered jobs with revenue not invoiced, oldest first. Total the unbilled amount. For each job, check the charges with /shipment before suggesting /invoice.

Run: `node scripts/forwarding.mjs unbilled`. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
