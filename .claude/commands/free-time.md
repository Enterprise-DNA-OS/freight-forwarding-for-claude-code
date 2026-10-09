---
description: Import containers still out, by days of free time left
---

Import containers still out, by days of free time left. Negative days_left means detention is running. Name the customer and suggest the call: return the empty, or warn them the detention will be charged on.

Run: `node scripts/forwarding.mjs free-time`. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
