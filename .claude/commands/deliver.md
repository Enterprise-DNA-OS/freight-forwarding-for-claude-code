---
description: Record delivery to the consignee
---

Record delivery to the consignee. Into Australia, goods over AUD 1,000 need an entry recorded first.

Run: `node scripts/forwarding.mjs deliver` with --shipment --actor; optional --date. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
