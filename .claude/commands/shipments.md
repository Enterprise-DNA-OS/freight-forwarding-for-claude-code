---
description: The shipment board: every open job by arrival or departure
---

The shipment board: every open job by arrival or departure. Show the table. Call out anything with a negative days_to_eta and no arrival.

Run: `node scripts/forwarding.mjs shipments` with optional --status --customer --direction --mode --operator. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
