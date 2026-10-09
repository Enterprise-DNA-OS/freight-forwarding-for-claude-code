# The rules this system checks

Sources checked 9 October 2026. `npm run fwd -- compliance` (or `/compliance`) runs every rule below against the records and cites the rule on each finding. This is a record checker. It does not lodge a cargo report or an import declaration, decide a tariff classification, or decide whether goods are BMSB target goods. Those are a person's call (often a licensed customs broker's), recorded on the job with `update-shipment`, `report-cargo` and `record-entry`. Nothing here is legal advice.

The border rules follow the destination country in the UN/LOCODE of the destination port (`AUMEL` is Australia, `NZAKL` is New Zealand).

| Rule | What it checks | Source |
|---|---|---|
| AU-ICS-64AB | An import into Australia that we report (`we_report_cargo`) has no house cargo report recorded. Due 48 hours before arrival by sea, 2 hours by air. Shown from four days out. | Customs Act 1901 (Cth) s64AB. [ABF cargo reports](https://www.abf.gov.au/importing-exporting-and-manufacturing/cargo-reporting-and-transhipped-goods/cargo-reports), [ABF sea cargo report fact sheet](https://www.abf.gov.au/help-and-support-subsite/files/64ab-cargo-report-sea-updated-2021.pdf). A freight forwarder responsible for goods on the vessel or aircraft is a cargo reporter and reports at house bill level. |
| AU-DECL-68 | An import into Australia with a customs value over AUD 1,000 has no import declaration recorded within two days of arrival, or has arrived without one. | Customs Act 1901 (Cth) s68 (goods over the AUD 1,000 low value threshold are entered by a full import declaration). The ABF recommends remaining documents, including import declarations, are lodged at least 24 hours before arrival. |
| NZ-DECL-20 | An import into New Zealand with a customs value over NZD 1,000 has no import declaration recorded. Due no later than 20 days after arrival. | Customs and Excise Act 2018. [NZ Customs import declaration requirements](https://www.customs.govt.nz/media/blncsf53/import-declaration-requirements-1.pdf): a standard declaration for goods over NZD 1,000, declared no later than 20 days after arrival. |
| BMSB-SEASON | A sea import into Australia or New Zealand of target high risk goods (`bmsb_target_goods`), from a country in `bmsb_countries`, shipped on board between 1 September and 30 April, has no treatment certificate recorded. | Department of Agriculture, Fisheries and Forestry [BMSB seasonal measures](https://www.agriculture.gov.au/import/before/brown-marmorated-stink-bugs) and the [2025-26 industry presentation](https://www.agriculture.gov.au/sites/default/files/documents/2025-26-bmsb-industry-presentation.pdf) (goods shipped 1 September to 30 April inclusive, by the bill of lading date). New Zealand's Ministry for Primary Industries runs matching seasonal measures. The seeded country list is the 2025-26 list: check the department's list for the current season. |
| SOLAS-VGM | A full container on an export sea booking has no verified gross mass, and the cargo cutoff is within three days or has passed. | SOLAS chapter VI regulation 2 (in force 1 July 2016): a packed container is not loaded without a verified gross mass. Enforced in Australia by AMSA and in New Zealand by Maritime NZ. |
| DG-DECLARATION | An export or cross trade job carrying dangerous goods has no dangerous goods declaration recorded before departure. | IMDG Code chapter 5.4 (sea) and IATA Dangerous Goods Regulations section 8 (air): the shipper's declaration travels with the goods. |

## House policies

These are local rules, not law. Change them with `/customise`.

| Rule | What it checks |
|---|---|
| POLICY-FREE-TIME | An import container is still out two days or less before its free time ends, or after it ended (detention running). Free time runs from vessel arrival: `free_days` on the container, or the business default in `settings`. |
| POLICY-UNBILLED | A delivered job has revenue not invoiced, or no revenue at all, more than `invoice_within_days` after delivery. Severity 1 at twice that. |
| POLICY-UNRECOVERED | An open job has a cost under a recoverable charge code (`charge_codes.recoverable`) with no revenue line under the same code. |
| POLICY-MARGIN | A job open or closed in the last 30 days has a margin under the floor in `settings`. |
| POLICY-ETA | The ETA has passed on a booked or in-transit job with no arrival recorded. |
| POLICY-IMPORT | A job imported from CargoWise is still a draft: check the customer, dates and charges, then book it. |

## How the clocks count

- The cargo report clock runs from the ETA date at 00:00 UTC, the earliest the vessel can arrive that day. That is cautious on purpose. The ABF counts from the later of the original estimated time on the Impending Arrival Report and the actual arrival: change the rule with `/customise` if you hold arrival times.
- Voyages of 24 to 48 hours have a 24-hour sea report time, and short flights have their own times in the Customs Regulation 2015. The rule does not model those: record the report as soon as it is lodged.
- The NZ declaration clock is calendar days from the arrival date.
- A finding with severity 1 is breached or needs action now. Severity 2 is due or missing. Severity 3 is a gap in the record.

## Keeping the rules current

The BMSB country list and goods change each season. Update `bmsb_countries` (and this file) in a new migration when the department publishes the new list. When a threshold or timeframe changes, update this file and the matching part of `compliance_findings` in a new migration, together, in one change. If `/compliance` meets a rule that looks out of date, it says so and stops.
