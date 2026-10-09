<h1 align="center">Freight Forwarding for Claude Code</h1>

<p align="center">
  <strong>The open-source freight forwarding system that is just a database and Claude Code.</strong>
</p>

<p align="center">
  Created by <a href="https://www.enterprisedna.co"><strong>Enterprise DNA</strong></a>. Free and open source. Works with Claude Code, Codex, OpenCode or Cursor.
</p>

<!-- three-doors -->
<table align="center">
  <tr>
    <td align="center"><strong>Do it yourself</strong><br/>Clone it, run it, own it. Free, MIT.<br/><a href="#quick-start">Quick start</a></td>
    <td align="center"><strong>We customise it</strong><br/>Your fields, your rules, your CargoWise data brought across.<br/><a href="https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=cargowise">Book a call</a></td>
    <td align="center"><strong>We run it for you</strong><br/>Installed, connected and operated inside Omni. Setup fee, then a retainer.<br/><a href="https://enterprisedna.co/omni/instead-of/cargowise?utm_source=github&utm_medium=readme&utm_campaign=cargowise">How it works</a></td>
  </tr>
</table>

<p align="center">
  <a href="#what-is-this">What is this</a> &bull;
  <a href="#why-no-front-end">Why no front end</a> &bull;
  <a href="#quick-start">Quick start</a> &bull;
  <a href="#the-commands">Commands</a> &bull;
  <a href="#instead-of-cargowise">Instead of CargoWise</a> &bull;
  <a href="#want-it-installed-and-run-for-you">Installed for you</a> &bull;
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node-20+-339933?style=flat-square" alt="Node 20+" />
  <img src="https://img.shields.io/badge/PostgreSQL-any-336791?style=flat-square" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/PGlite-embedded-3ecf8e?style=flat-square" alt="PGlite" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License" />
</p>

---

## What is this

Freight Forwarding for Claude Code does the job you pay CargoWise for, as a database and a set of agent commands. There is no web front end. You open the folder in [Claude Code](https://claude.com/claude-code) (or Codex, OpenCode, Cursor: see `AGENTS.md`) and ask for what you want in plain language. It runs the right query, and it answers questions the CargoWise screens do not.

Since December 2025 CargoWise charges forwarders per shipment: its published list price is USD 19.95 for every FCL import shipment, USD 13.30 for every LCL or air import and USD 12.75 for every FCL export, with read-only cloud access at USD 2,500 a month ([CargoWise Value Pack Community Pricing](https://www.cargowise.com/lp/cargowise-value-pack/cargowise-value-pack-community-pricing/), checked 9 October 2026; [research notes](docs/research.md)). The bill grows with every box you move.

It holds the jobs (house shipments, import, export and cross trade, sea FCL, sea LCL and air), the customers, carriers, overseas agents and truckers, containers with their VGM and free time, milestones planned and actual, and the costs and revenue on every job, so job profit, unbilled work and costs never charged on are always one question away. It checks the border and carriage rules an Australian or New Zealand forwarder answers for: the house cargo report clock, import declarations over the AUD and NZD 1,000 thresholds, BMSB season treatment, VGM before the cargo cutoff and dangerous goods declarations. It is built for freight forwarders and customs brokers with five to fifty staff.

Want the same thing with a web front end, carrier feeds or a customer portal? That is a customisation, and it is exactly what Enterprise DNA does: [book a call](https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=cargowise).

## The weekly rituals

| When | Ask | Command |
|---|---|---|
| Every morning | What is breached, due or late today? | `/attention`, `/arrivals`, `/cutoffs` |
| Before each vessel | Is the cargo report in, is the entry in, is the treatment certificate in? | `/compliance`, `/bmsb`, `/report-cargo`, `/record-entry` |
| Before each cutoff | Which containers have no VGM, which dangerous goods have no declaration? | `/cutoffs`, `/update-container`, `/update-shipment` |
| After arrival | Which containers start costing detention? | `/free-time`, `/update-container` |
| Friday | What did we deliver and not invoice, and what did we pay and not charge? | `/unbilled`, `/margin-leaks`, `/invoice` |
| Monday | The week in one page | `/weekly-review` |
| Month end | Which customers and carriers make us money? | `/job-profit`, `/customer-profit`, `/carrier-reliability` |

## Why no front end

- The front end was only ever there because the database was hard to talk to. That is no longer true.
- Your data sits in plain Postgres tables you own. Any tool can read them. No export, no lock-in.
- No seats, no fee per shipment, no add-ons. Read [docs/why-no-front-end.md](docs/why-no-front-end.md) for the honest trade-offs too.

## Quick start

Sixty seconds, no database install (an embedded Postgres runs inside Node):

```bash
git clone https://github.com/Enterprise-DNA-OS/freight-forwarding-for-claude-code.git
cd freight-forwarding-for-claude-code
npm install
npm run demo
```

The demo is Southern Cross Forwarding, a fictional Melbourne forwarder with a Hamburg container whose house cargo report is already late, a container out of free time, a job delivered nine days ago and not invoiced, a cartage cost never charged on, a wine export with a container missing its VGM and a battery shipment with no dangerous goods declaration. Open the folder in Claude Code and type `/attention` first.

### Use it with your own Postgres or Supabase

Copy `.env.example` to `.env`, set `DATABASE_URL`, then `npm run migrate`. Same commands, shared data, no per-seat fee. Then `npm run fwd -- settings --name="Your Business" --country=NZ --currency=NZD --actor="You"`.

## Ten questions CargoWise does not answer for you

Each one runs against the demo data today.

1. Which delivered jobs have we not invoiced, and how much is sitting there? `/unbilled`
2. Which costs did we pay that we never charged the customer? `/margin-leaks`
3. Which customers make us the least profit per job? `/customer-profit`
4. Which carriers' arrivals slip furthest from the first ETA they gave? `/carrier-reliability`
5. Which import containers start costing detention this week? `/free-time`
6. Which house cargo reports are due before the 48-hour cutoff? `/compliance`
7. Which sailings this BMSB season still have no treatment certificate? `/bmsb`
8. Which export containers have no VGM with the cargo cutoff three days out? `/cutoffs`
9. Which jobs closed under our margin floor? `/job-profit`
10. Which milestones are late, and on whose jobs? `/exceptions`

## The commands

40 slash commands in `.claude/commands`, 38 of them driving one CLI command each (`npm run fwd -- <command>`, `--json` for machines).

| Command | What it does |
|---|---|
| `/attention` | Everything breached, due or late, in one list |
| `/weekly-review` | The Monday review: rules, arrivals, cutoffs, free time, unbilled jobs, late milestones |
| `/compliance` | Every rule finding, breached first, with the rule cited |
| `/shipments`, `/shipment` | The board, or one job with containers, milestones, charges, profit and history |
| `/arrivals` | Imports arriving or arrived, with the cargo report and entry for each |
| `/cutoffs` | Export bookings by cutoff, with VGM and dangerous goods declarations missing |
| `/free-time` | Import containers still out, by days of free time left |
| `/exceptions` | Planned milestones that passed with nothing recorded |
| `/unbilled` | Delivered jobs not invoiced |
| `/job-profit`, `/customer-profit` | Profit and margin per job and per customer |
| `/margin-leaks` | Costs paid with no matching charge to the customer |
| `/carrier-reliability` | ETA slip by carrier |
| `/bmsb` | This season's BMSB exposure and treatment certificates |
| `/operator-workload` | Open jobs, findings, late milestones and unbilled jobs by operator |
| `/draft-status`, `/draft-arrival-notice` | A customer status update or an arrival notice, drafted to `drafts/`, never sent |
| `/book`, `/update-shipment`, `/cancel`, `/close-job` | The job from booking to closed |
| `/add-container`, `/update-container` | Containers, ISO 6346 check digit, VGM, gate out and empty return |
| `/milestone` | Plan a milestone or record it happened |
| `/add-charge`, `/invoice`, `/post-cost` | Costs and revenue, invoices and supplier bills against the job |
| `/report-cargo`, `/record-entry`, `/deliver` | The cargo report, the import declaration and delivery |
| `/parties`, `/add-party` | Customers, carriers, agents, truckers and suppliers |
| `/settings`, `/log`, `/activity` | Who this is for, notes and the history |
| `/import`, `/export` | Bring CargoWise across; back everything up |
| `/customise`, `/new-view` | Make it yours: fields, rules, charge codes, views |

## Paperwork, views and checks

Change `brand.json` once. `npm run docs` renders an arrival notice for every import not yet delivered, a job sheet for every job and an open shipments statement for every customer. `npm run view` renders the forwarding week, job profit and the shipment board.

[docs/compliance.md](docs/compliance.md) lists every rule with its source: the Customs Act 1901 s64AB cargo report times and the s68 AUD 1,000 threshold, the NZ Customs NZD 1,000 threshold and 20-day declaration, the BMSB seasonal measures, SOLAS VGM and the dangerous goods declaration, plus the house policies you can change. It is a record checker, not legal advice, and it lodges nothing.

## Your first hour: ten things to ask for

1. Put our name, logo and colours on the arrival notices.
2. Set us up as an Auckland forwarder billing in NZD.
3. Load this season's BMSB country list.
4. Test our CargoWise shipment list without saving anything.
5. Add our charge codes and say which ones we always pass on.
6. Show every job where we paid detention and did not charge it.
7. Give each container 14 free days on our Maersk contract.
8. Add a "customer PO" field to every job and show it on the arrival notice.
9. Draft a status update for every customer with something arriving this week.
10. Build a read-only page for the sales team: profit by customer this quarter.

## Instead of CargoWise

Export a shipment list report from CargoWise as CSV, then:

```bash
npm run fwd -- import cargowise --file=shipments.csv --actor="Your name" --dry-run
npm run fwd -- import cargowise --file=shipments.csv --actor="Your name"
```

Jobs arrive as drafts with the original row kept, new clients are added as customers, repeats change nothing, and a row that changed since the last import stops the run. Map your own headings with `--map`. Containers, charges and milestones are separate reports. Full steps and what does not carry over: [docs/replace-cargowise.md](docs/replace-cargowise.md).

## Verification

`npm test` uses a temporary database and runs all 39 CLI commands, every border, carriage and house rule turning on and off, the cargo report clock, ISO 6346 check digits, job closing checks, import dry runs, repeats, rollback and mapping, the drafts, the export and the escaped HTML pages. Set `TEST_DATABASE_URL` to a new, empty Postgres to run the same suite there. GitHub checks run Linux, Windows and Postgres.

## Architecture

```
freight-forwarding-for-claude-code/
  CLAUDE.md                 how the operator wants this run (routing table + house rules)
  AGENTS.md                 the same, for Codex / OpenCode / Cursor / Gemini CLI
  .claude/commands/         the slash commands
  scripts/                  the CLI the commands drive
  scripts/lib/db.mjs        one adapter: DATABASE_URL (pg) or embedded PGlite
  scripts/forwarding.mjs    the one CLI: npm run fwd -- <command>
  supabase/migrations/      plain SQL schema, views and the rule checks
  supabase/seed.sql         demo data
  fixtures/cargowise.csv    a sample CargoWise shipment list for the import test
  docs/                     the rules and sources, the CargoWise guide, the research
```

## Built for coding agents

The database, CLI and command recipes work with Claude Code, Codex, OpenCode or Cursor. Ask your coding agent for a new command and have it implement and test the change against the same records.

## Contributing

Issues and pull requests are welcome. Keep the shape: plain SQL, a small CLI, a slash command per recurring job, no front end.

## Want it installed and run for you?

Enterprise DNA installs Freight Forwarding for Claude Code for your business, migrates your CargoWise data, connects it to the rest of your tools, and runs it for you as part of **Omni**, our managed Command Center. One setup fee, then a monthly retainer.

- Book a call: [enterprisedna.co/omni/book](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=cargowise)
- Read more: [enterprisedna.co/omni/instead-of/cargowise](https://enterprisedna.co/omni/instead-of/cargowise?utm_source=github&utm_medium=readme&utm_campaign=cargowise)

## License

MIT. Copyright (c) 2026 Enterprise DNA. Not affiliated with CargoWise, WiseTech Global or Anthropic. Hosting and agent use have separate costs.
