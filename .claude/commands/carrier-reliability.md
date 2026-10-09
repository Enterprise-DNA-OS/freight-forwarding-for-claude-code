---
description: How far each carrier's arrivals slip from the first ETA they gave
---

How far each carrier's arrivals slip from the first ETA they gave. Lead with the worst average slip. Use it when quoting transit times to customers.

Run: `node scripts/forwarding.mjs carrier-reliability`. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
