---
description: Imports arriving or arrived and not yet delivered, with the cargo report and entry for each
---

Imports arriving or arrived and not yet delivered, with the cargo report and entry for each. Lead with anything arriving in the next two days with no cargo report or no entry number.

Run: `node scripts/forwarding.mjs arrivals` with --days=14. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
