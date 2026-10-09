---
description: Add a container to a sea job
---

Add a container to a sea job. The number is checked against its ISO 6346 check digit. A failure is a typo: check the booking, never change a digit to make it pass.

Run: `node scripts/forwarding.mjs add-container` with --shipment --number --actor; optional --size --seal --vgm --free-days. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
