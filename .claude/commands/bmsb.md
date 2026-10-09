---
description: This season's BMSB exposure: target goods from target risk countries and whether they were treated
---

This season's BMSB exposure: target goods from target risk countries and whether they were treated. Anything with target_goods and target_country true, in season, and no treatment certificate needs treatment arranged or recorded. Check the current season's country and goods list on the department's website first.

Run: `node scripts/forwarding.mjs bmsb`. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
