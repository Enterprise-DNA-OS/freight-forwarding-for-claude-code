---
description: Write the arrival notice for an import to drafts/
---

Write the arrival notice for an import to drafts/. Read it back. Check the vessel, ETA, free time and charges before a person sends it.

Run: `node scripts/forwarding.mjs draft-arrival-notice` with --shipment. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
