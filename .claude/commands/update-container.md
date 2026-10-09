---
description: Record a VGM, seal, gate out or empty return on a container
---

Record a VGM, seal, gate out or empty return on a container. An empty return stops the free time clock.

Run: `node scripts/forwarding.mjs update-container` with --container --actor with --seal --vgm --free-days --gate-out --empty-returned. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, pays or deletes.
