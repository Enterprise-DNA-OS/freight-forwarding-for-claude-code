---
description: Bring a CargoWise shipment list report across
---

Bring a CargoWise shipment list report across. Read docs/replace-cargowise.md first. Use a separate DATA_DIR for the first try, run with --dry-run, then for real. Imported jobs arrive as drafts; book each one with update-shipment --status=booked once it is checked.

Run: `node scripts/forwarding.mjs import` with cargowise --file=shipments.csv --actor; optional --map=columns.json --dry-run. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
