---
description: Cancel a job that will not move
---

Cancel a job that will not move. It refuses once anything is invoiced or posted: credit those first.

Run: `node scripts/forwarding.mjs cancel` with --shipment --reason --actor. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
