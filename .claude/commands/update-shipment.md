---
description: Change a job: new ETA, departure or arrival, vessel, cutoffs, declarations and certificates
---

Change a job: new ETA, departure or arrival, vessel, cutoffs, declarations and certificates. Recording --atd moves a booking to in transit; --ata moves it to arrived and starts the free time. Cutoff times are UTC unless an offset is given: say the time back before recording it.

Run: `node scripts/forwarding.mjs update-shipment` with --shipment --actor with the changed fields. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
