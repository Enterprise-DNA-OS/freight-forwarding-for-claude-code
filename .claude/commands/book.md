---
description: Book a new job (house shipment)
---

Book a new job (house shipment). Ports are UN/LOCODEs (AUMEL, CNSHA, NZAKL): the country in the code drives the border rules. Ask whether the goods are dangerous and whether they are BMSB target goods. The first ETA is kept, so carrier slip can be measured.

Run: `node scripts/forwarding.mjs book` with --reference --direction=import|export|crosstrade --mode=sea-fcl|sea-lcl|air --customer --actor; optional --carrier --agent --operator --incoterm --origin --destination --etd --eta --voyage --house-bill --master-bill --goods --packages --weight --volume --customs-value --doc-cutoff --cargo-cutoff --dangerous-goods --bmsb-goods --we-report-cargo. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
