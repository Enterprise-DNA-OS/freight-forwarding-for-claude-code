---
description: Record that a person lodged the house cargo report
---

Record that a person lodged the house cargo report. Only record it once the operator confirms it was lodged. Times are UTC unless an offset is given.

Run: `node scripts/forwarding.mjs report-cargo` with --shipment --at --actor. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
