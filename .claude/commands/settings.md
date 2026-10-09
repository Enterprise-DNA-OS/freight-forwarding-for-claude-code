---
description: Show or change who this is for: name, country, base currency, free days, margin floor and how fast jobs are invoiced
---

Show or change who this is for: name, country, base currency, free days, margin floor and how fast jobs are invoiced. Say the change back before making it.

Run: `node scripts/forwarding.mjs settings` with optional --name --country=AU|NZ --currency --free-days --margin-floor --invoice-within --actor. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
