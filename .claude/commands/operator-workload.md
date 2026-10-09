---
description: Open jobs, rule findings, late milestones and unbilled jobs by operator
---

Open jobs, rule findings, late milestones and unbilled jobs by operator. Show who is carrying the most and suggest what to move.

Run: `node scripts/forwarding.mjs operator-workload`. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
