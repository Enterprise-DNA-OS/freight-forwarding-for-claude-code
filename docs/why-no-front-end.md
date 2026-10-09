# Why there is no front end

A forwarding system is a list of jobs, the containers and milestones on each, the costs and revenue on each, and a calendar of cutoffs, arrivals, reports and free time. What a forwarding subscription charges for is the screens over those lists, and now, per shipment, for every job that passes through them.

Those screens were needed because the database was hard to talk to. It is not any more. Open this folder in Claude Code and ask "which containers start costing detention this week?" or "which delivered jobs have we not invoiced?" and it runs the query and answers. Ask a question nobody built a report for and you still get an answer.

## What you gain

- **Answers to your own questions.** The ten in the README are the start. Ask for the next one in plain words.
- **No fee per shipment.** The bill does not grow with your volume or your headcount.
- **Your jobs in a database you own.** Plain tables. Back them up, report from them, leave any time.
- **Rules you can read.** Every check is written down in `docs/compliance.md` with its source, and in one SQL view you can change.

## What you give up

- **Lodgement links.** This does not lodge cargo reports or import declarations with the border agencies. Keep your broker or lodgement service, and record the result here.
- **EDI with carriers.** Bookings, status messages and invoices from carriers arrive by email or portal, and a person or a script records them.
- **A form for every field and a phone app.** Operators ask for what they want. It runs where Claude Code runs.
- **A vendor help desk.** This is open source. Enterprise DNA supports the installed version.

Enterprise DNA builds a web front end, carrier and tracking feeds, and a customer portal onto the same database for forwarders that want them. The records underneath stay yours.

Installed and run for you: https://enterprisedna.co/omni/instead-of/cargowise
