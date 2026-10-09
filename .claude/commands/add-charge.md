---
description: Add a cost or a revenue line to a job
---

Add a cost or a revenue line to a job. Costs come from a carrier, agent, trucker or supplier; revenue goes to the customer. Foreign currency needs the --fx rate to the base currency. Every recoverable cost should have a revenue line under the same code.

Run: `node scripts/forwarding.mjs add-charge` with --shipment --side=cost|revenue --code --party --amount --currency --actor; optional --fx --description. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
