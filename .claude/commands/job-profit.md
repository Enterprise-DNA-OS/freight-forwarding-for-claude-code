---
description: Revenue, cost, profit and margin per job
---

Revenue, cost, profit and margin per job. Lead with the lowest margins. Accrued costs are estimates until the supplier invoice is posted.

Run: `node scripts/forwarding.mjs job-profit` with optional --since=YYYY-MM-DD --customer --below-floor. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
