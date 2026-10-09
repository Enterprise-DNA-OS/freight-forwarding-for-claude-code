---
description: Close a finished job
---

Close a finished job. It refuses while revenue is unbilled, costs are accrued or import containers are still out. Fix those, then close.

Run: `node scripts/forwarding.mjs close-job` with --shipment --actor; optional --date. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
