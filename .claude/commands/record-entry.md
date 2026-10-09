---
description: Record the import declaration (entry) number and, when it clears, the clearance date
---

Record the import declaration (entry) number and, when it clears, the clearance date. This records a declaration lodged by a person or broker. Nothing is lodged from here.

Run: `node scripts/forwarding.mjs record-entry` with --shipment --entry --actor; optional --cleared. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
