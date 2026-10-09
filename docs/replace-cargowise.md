# Moving off CargoWise

CargoWise does not publish an export format for its shipment records. What every CargoWise site can do is run a shipment list or job report and export it to Excel or CSV. The headings depend on the report and how your site set it up, so the import reads the common headings and lets you map your own.

## 1. Export the shipments

In CargoWise, run a shipment list (or the job report your team already uses) for the jobs you want to bring across, usually every open job plus the last 12 months. Include the shipment ID, house bill, master bill, local client, direction, transport mode, container mode, origin and destination (UN/LOCODE), ETD, ETA, ATD, ATA, vessel, voyage, goods description, packages, weight, volume and incoterm. Export to Excel and save it as CSV (UTF-8). If you cannot find the report, ask your CargoWise administrator which one your operators use.

## 2. Try the import on a separate copy

```bash
DATA_DIR=./.data/trial npm run migrate
DATA_DIR=./.data/trial npm run fwd -- import cargowise --file=shipments.csv --actor="Your name" --dry-run
```

The dry run reads every row, checks it and rolls back. Nothing is saved.

The import looks for these headings (any one in each row, case does not matter):

| Field | Headings it reads |
|---|---|
| Shipment ID (required) | Shipment ID, Shipment Number, Job Number, Shipment |
| Client (required) | Local Client, Client, Consignee, Importer |
| Direction (required) | Direction, Job Direction, Shipment Direction (Import, Export, Cross Trade, IMP, EXP, CRT) |
| Transport mode (required) | Transport Mode, Trans. Mode, Mode (SEA or AIR) |
| Container mode | Container Mode, Cont. Mode (FCL, otherwise LCL) |
| Origin, destination | Origin, Origin Port, Load Port, Port of Loading; Destination, Destination Port, Discharge Port, Port of Discharge |
| House and master bill | House Bill, HBL, HAWB; Master Bill, Ocean Bill, MBL, MAWB |
| Dates | ETD, ETA, ATD, ATA (12-Oct-26, DD/MM/YYYY or YYYY-MM-DD) |
| Vessel and voyage | Vessel, Vessel Name; Voyage, Voyage/Flight, Flight |
| Goods | Goods Description, Description; Packages, Outer Packs, Pieces; Weight, Weight (KG); Volume, Volume (M3) |
| Incoterm | INCO Terms, Incoterm, Incoterms |

If your headings differ, write a map and pass `--map=columns.json`:

```json
{ "source_id": "Job", "customer": "Customer", "direction": "Dir", "transport": "Mode", "container_mode": "Load", "origin": "From", "destination": "To" }
```

## 3. Import and review

Run it again without `--dry-run`. Every job arrives as a draft with its original row kept in `source_row`, numbered `CW-<shipment ID>`. A client that is not already a customer is added as one, and the import says how many. `/compliance` lists every draft under POLICY-IMPORT until someone checks it and books it (`update-shipment --status=booked`). Drafts stay off the board and out of the border rules until then.

Running the same file again changes nothing. If a row changed in CargoWise since the last import, the import stops and names it, so a checked job is never overwritten.

## What does not come across in a shipment list

- Containers, charges (costs and revenue), milestones and documents are separate CargoWise reports. Add them with the commands, or ask Claude Code to write an import for each report's columns. Enterprise DNA does this mapping as part of a switch.
- Customs declarations and cargo reports are lodged through CargoWise's links to the border agencies. This system records that they were lodged and when; it does not lodge them. Keep your lodgement channel (a broker, or a lodgement service) and record the result here.
- Accounting (debtors, creditors, GL postings) stays in your accounts system. Here, invoices and supplier bills are recorded by their numbers against the job.
- The eDocs, workflow and EDI messages stay in CargoWise. Export what you must keep.

## Run both side by side

Keep CargoWise running for a month of arrivals. Run `/weekly-review`, `/unbilled` and `/job-profit` here and compare them with your CargoWise reports. Switch off what you no longer need when the numbers match.
