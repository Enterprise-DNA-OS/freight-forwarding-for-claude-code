---
description: Check every job against the rules in docs/compliance.md and report what is breached, due or missing
---

Check every job against the rules in docs/compliance.md and report what is breached, due or missing. Severity 1 is breached or needs action now. Cite the rule for each finding. If a rule looks out of date (a new BMSB season list, a changed threshold), say so and stop: do not guess at law.

Run: `node scripts/forwarding.mjs compliance`. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
