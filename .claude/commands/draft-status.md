---
description: Write a shipment status update for one customer to drafts/
---

Write a shipment status update for one customer to drafts/. Read the draft back to the operator. It is a draft: a person checks the dates with the carrier and sends it.

Run: `node scripts/forwarding.mjs draft-status` with --customer. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
