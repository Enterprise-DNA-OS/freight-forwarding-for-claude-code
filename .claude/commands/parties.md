---
description: Customers, carriers, overseas agents, truckers and suppliers
---

Customers, carriers, overseas agents, truckers and suppliers. Show the list. Use the code when booking or charging.

Run: `node scripts/forwarding.mjs parties` with optional --kind=customer|carrier|agent|trucker|supplier. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
