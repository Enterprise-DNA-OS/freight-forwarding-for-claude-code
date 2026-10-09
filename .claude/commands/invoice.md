---
description: Mark every open revenue line on a job as invoiced, with the invoice number from the accounts system
---

Mark every open revenue line on a job as invoiced, with the invoice number from the accounts system. This records an invoice raised elsewhere. It does not create or send one.

Run: `node scripts/forwarding.mjs invoice` with --shipment --ref --actor; optional --date. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
