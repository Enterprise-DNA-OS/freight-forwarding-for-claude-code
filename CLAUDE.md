# Freight Forwarding for Claude Code: operating instructions

This file is the brain. Claude Code reads it at the start of every session. It says who this is for, how work gets done, and the one right way to do each recurring job.

## Who this is for

- **Business:** [YOUR BUSINESS]
- **Operator:** [YOUR NAME], [your role]
- **What matters most:** [the one or two outcomes you care about]

Fill this in once. A worker with context knows. A worker without it guesses.

## How to work

1. **Take a brief, not a script.** The operator describes the outcome. You run the right command and present the answer.
2. **Read before you write.** Before drafting anything about a record, read its full history first.
3. **Plain language.** Short sentences. No filler. Numbers in tables.
4. **Silent success, loud problems.** No play-by-play. Say what broke and what you did about it.
5. **Stop at the line.** Anything that sends, deletes, or faces a customer waits for a yes in this session.

## Routing table: one right way for each recurring job

| When the operator asks for... | Use this |
|---|---|
| What needs attention, what is late | `/attention` |
| The Monday review | `/weekly-review` |
| Are we compliant, what is breached | `/compliance` (rules and sources in `docs/compliance.md`) |
| The board, one job | `/shipments`, `/shipment` |
| What is arriving, is the cargo report and entry in | `/arrivals` |
| What is about to cut off, what is missing | `/cutoffs` |
| Detention and free time | `/free-time` |
| Late milestones | `/exceptions` |
| Delivered and not invoiced | `/unbilled` |
| Profit per job or per customer | `/job-profit`, `/customer-profit` |
| Costs we never charged on | `/margin-leaks` |
| Which carrier runs late | `/carrier-reliability` |
| BMSB season check | `/bmsb` |
| Who is behind | `/operator-workload` |
| A status update or arrival notice for a customer | `/draft-status`, `/draft-arrival-notice` (drafts only, a person sends) |
| A new job | `/book` |
| New ETA, departure, arrival, vessel, cutoffs, certificates | `/update-shipment` |
| Containers, VGM, gate out, empty return | `/add-container`, `/update-container` |
| Plan or record a milestone | `/milestone` |
| Costs, revenue, invoices, supplier bills | `/add-charge`, `/invoice`, `/post-cost` |
| The cargo report or entry was lodged | `/report-cargo`, `/record-entry` |
| Delivered, closed, cancelled | `/deliver`, `/close-job`, `/cancel` |
| Customers, carriers, agents, truckers | `/parties`, `/add-party` |
| History or a note | `/activity`, `/log` |
| Who we are, free days, margin floor | `/settings` |
| Bring CargoWise across | `/import` (read `docs/replace-cargowise.md` first) |
| Back everything up | `/export` |
| Change a field, a charge code or a rule | `/customise` |
| A new read-only page | `/new-view` |

If an ask fits nothing here, run the CLI directly (`npm run fwd -- help`) and then propose a new command for it.

## Hard rules

- Never send email or messages from here. Draft to `drafts/`, a person sends.
- Never delete records without an explicit yes in this session. Prefer marking closed or archived.
- Never invent a record. If a name is ambiguous, list the candidates and ask.
- The database is the source of truth. If the answer is not in it, say so.
- Never record a cargo report, import declaration or treatment certificate as lodged until a person says it was. Nothing here lodges anything with a border agency.
- Never decide a tariff classification, a customs value or whether goods are BMSB target goods. Ask the responsible person (often the licensed broker) and record their answer.
- Cutoff and report times are UTC unless the operator gives an offset. Say the time back before recording it.
- A container number that fails its check digit is a typo. Check the booking; never change a digit to make it pass.

## Where things live

- `scripts/` the CLI. `scripts/lib/db.mjs` picks `DATABASE_URL` (Postgres, Supabase) or the embedded database in `.data/`.
- `supabase/migrations/` the schema, plain SQL. `npm run migrate` applies it.
- `.claude/commands/` the slash commands. Add one every time the same ask comes twice.
- `docs/` the rules and their sources, the guide for moving off CargoWise, and the research.

Built by Enterprise DNA. Installed and run for you as part of Omni: https://enterprisedna.co/omni/instead-of/cargowise
