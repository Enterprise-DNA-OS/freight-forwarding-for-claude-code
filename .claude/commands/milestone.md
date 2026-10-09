---
description: Plan a milestone or record that it happened
---

Plan a milestone or record that it happened. Codes: booking-confirmed, docs-received, cargo-ready, gate-in, departed, arrived, customs-cleared, delivered, pod-received.

Run: `node scripts/forwarding.mjs milestone` with --shipment --code --actor and --planned and/or --actual; optional --note. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
