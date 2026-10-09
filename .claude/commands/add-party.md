---
description: Add a customer, carrier, overseas agent, trucker or supplier
---

Add a customer, carrier, overseas agent, trucker or supplier. Check /parties first so nobody is added twice.

Run: `node scripts/forwarding.mjs add-party` with --code --name --kind --actor; optional --email --contact. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
