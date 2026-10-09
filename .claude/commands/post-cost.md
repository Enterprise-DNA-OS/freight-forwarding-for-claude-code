---
description: Match a supplier invoice to the open costs from that supplier on a job
---

Match a supplier invoice to the open costs from that supplier on a job. If the supplier invoice differs from the accrual, fix the cost line first and say by how much.

Run: `node scripts/forwarding.mjs post-cost` with --shipment --party --ref --actor; optional --code --date. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
