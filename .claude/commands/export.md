---
description: Write every record to a JSON backup in exports/
---

Write every record to a JSON backup in exports/. Say where the file is and how many jobs it holds.

Run: `node scripts/forwarding.mjs export`. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
