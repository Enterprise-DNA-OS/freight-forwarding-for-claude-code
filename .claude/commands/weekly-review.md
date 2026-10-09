---
description: The Monday forwarding review, written from the CLI output
---

The Monday forwarding review, written from the CLI output. Write it in six parts: rule findings, arrivals this week, export cutoffs this week, containers against free time, delivered and not invoiced, late milestones. One line each, operator named.

Run: `node scripts/forwarding.mjs weekly-review`. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
