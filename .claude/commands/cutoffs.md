---
description: Export bookings by cutoff, with VGM, dangerous goods declarations and documents still missing
---

Export bookings by cutoff, with VGM, dangerous goods declarations and documents still missing. For each booking with something missing, name who to chase and the cutoff time in UTC and local time.

Run: `node scripts/forwarding.mjs cutoffs` with --days=7. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
