#!/usr/bin/env node
// The one CLI. Every slash command in .claude/commands drives this file.
//   npm run fwd -- <command> [--option=value] [--json]
import fs from 'node:fs';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {getDb, REPO_ROOT} from './lib/db.mjs';
import {parseCsv, pick} from './lib/csv.mjs';
import {table} from './lib/format.mjs';

export const commands = {
  help: 'Show commands',
  shipments: 'Open jobs: optional --status --customer --direction --mode --operator',
  shipment: 'One job with containers, milestones, charges, profit and history: --shipment',
  parties: 'Customers, carriers, agents, truckers and suppliers: optional --kind',
  arrivals: 'Imports arriving or arrived and not delivered, with cargo report and entry: --days=14',
  cutoffs: 'Export bookings by cutoff with VGM, dangerous goods and documents still missing: --days=7',
  'free-time': 'Import containers still out, by days of free time left',
  exceptions: 'Planned milestones that have passed with nothing recorded',
  unbilled: 'Delivered jobs with revenue not invoiced, oldest first',
  'job-profit': 'Revenue, cost, profit and margin per job: optional --since --customer --below-floor',
  'margin-leaks': 'Costs we paid with no matching charge to the customer: optional --since',
  'customer-profit': 'Jobs, TEU, revenue, profit and margin by customer: optional --since',
  'carrier-reliability': 'ETA slip by carrier: days between the first ETA and the arrival',
  bmsb: 'This season\'s BMSB exposure: target goods from target risk countries and their treatment',
  compliance: 'Every rule finding, breached first, with the rule cited',
  attention: 'Everything breached, due or late, in one list',
  'operator-workload': 'Open jobs, findings, exceptions and unbilled jobs by operator',
  activity: 'Recorded history: optional --record',
  'weekly-review': 'Compliance, arrivals, cutoffs, free time, unbilled jobs and exceptions in one report',
  'draft-status': 'Write a shipment status update for one customer to drafts/: --customer',
  'draft-arrival-notice': 'Write the arrival notice for an import to drafts/: --shipment',
  settings: 'Show or change the business: optional --name --country --currency --free-days --margin-floor --invoice-within --actor',
  'add-party': '--code --name --kind=customer|carrier|agent|trucker|supplier --actor; optional --email --contact',
  book: '--reference --direction --mode --customer --actor; optional --carrier --agent --operator --incoterm --origin --destination --etd --eta --voyage --house-bill --master-bill --goods --packages --weight --volume --customs-value --doc-cutoff --cargo-cutoff --dangerous-goods --bmsb-goods --we-report-cargo',
  'update-shipment': '--shipment --actor with changed fields: --status --carrier --agent --operator --incoterm --etd --eta --atd --ata --voyage --house-bill --master-bill --goods --packages --weight --volume --customs-value --doc-cutoff --cargo-cutoff --dangerous-goods --dg-declaration --bmsb-goods --bmsb-cert --we-report-cargo',
  'add-container': '--shipment --number --actor; optional --size --seal --vgm --free-days',
  'update-container': '--container --actor with changed fields: --seal --vgm --free-days --gate-out --empty-returned',
  milestone: '--shipment --code --actor and --planned or --actual (or both); optional --note',
  'add-charge': '--shipment --side=cost|revenue --code --party --amount --currency --actor; optional --fx --description',
  invoice: 'Mark every open revenue line on a job invoiced: --shipment --ref --actor; optional --date',
  'post-cost': 'Match a supplier invoice to the open costs from that supplier: --shipment --party --ref --actor; optional --code --date',
  'report-cargo': 'Record that a person lodged the house cargo report: --shipment --at --actor',
  'record-entry': 'Record the import declaration or entry: --shipment --entry --actor; optional --cleared',
  deliver: '--shipment --actor; optional --date',
  'close-job': '--shipment --actor; optional --date',
  cancel: '--shipment --reason --actor',
  log: '--record --note --actor',
  import: 'cargowise --file=shipments.csv --actor; optional --map=columns.json --dry-run',
  export: 'Write every record to a JSON backup in exports/',
};

// ------------------------------------------------------------------ input checks

const required = (o, k) => { if (typeof o[k] !== 'string' || !o[k].trim()) throw Error(`--${k} is required`); return o[k].trim(); };
const today = () => new Date().toISOString().slice(0, 10);
export function date(value, label = 'date', nullable = true) {
  if ((value === null || value === undefined || value === '') && nullable) return null;
  const s = String(value ?? '').trim();
  const t = Date.parse(`${s}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(t) || new Date(t).toISOString().slice(0, 10) !== s) throw Error(`${label} must be a real ISO date (YYYY-MM-DD)`);
  return s;
}
const safeDate = date;
export function timestamp(value, label) {
  const s = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${safeDate(s, label, false)}T00:00:00.000Z`;
  if (!/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:?\d{2})?$/.test(s) || !Number.isFinite(Date.parse(s.replace(' ', 'T')))) throw Error(`${label} must be YYYY-MM-DD or YYYY-MM-DD HH:MM (UTC unless an offset is given)`);
  return new Date(s.replace(' ', 'T') + (/(Z|[+-]\d{2}:?\d{2})$/.test(s) ? '' : 'Z')).toISOString();
}
const bool = (v, label) => {
  if (v === true || ['true', 'yes', 'y', '1'].includes(String(v).toLowerCase())) return true;
  if (['false', 'no', 'n', '0'].includes(String(v).toLowerCase())) return false;
  throw Error(`--${label} must be true or false`);
};
const intIn = (v, lo, hi, label) => { const s = String(v ?? ''); if (!/^\d+$/.test(s) || Number(s) < lo || Number(s) > hi) throw Error(`--${label} must be a whole number from ${lo} to ${hi}`); return Number(s); };
const decimal = (v, label, places = 2) => { const s = String(v ?? '').replace(/,/g, '').trim(); if (!new RegExp(`^\\d{1,10}(\\.\\d{1,${places}})?$`).test(s)) throw Error(`--${label} must be a positive number with up to ${places} decimals`); return s; };
const days = (o, dflt) => intIn(o.days ?? String(dflt), 0, 3660, 'days');
const oneOf = (v, choices, label) => { if (!choices.includes(v)) throw Error(`--${label} must be ${choices.join('|')}`); return v; };
const currency = (v, label = 'currency') => { const s = String(v ?? '').trim().toUpperCase(); if (!/^[A-Z]{3}$/.test(s)) throw Error(`--${label} must be a three-letter currency code`); return s; };
// UN/LOCODE: two-letter country, three-letter place. The country drives the border rules.
export function locode(v, label) { const s = String(v ?? '').trim().toUpperCase().replace(/\s+/g, ''); if (!/^[A-Z]{2}[A-Z2-9]{3}$/.test(s)) throw Error(`--${label} must be a UN/LOCODE such as AUMEL or CNSHA`); return s; }
// ISO 6346: owner code, category, serial and a check digit. A mistyped number fails here.
export function containerNumber(v) {
  const s = String(v ?? '').trim().toUpperCase().replace(/[\s-]/g, '');
  if (!/^[A-Z]{3}[UJZ][0-9]{7}$/.test(s)) throw Error('Container number must be four letters (ending U, J or Z) and seven digits, such as MSKU7654328');
  const values = {}; let n = 10;
  for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') { if (n % 11 === 0) n++; values[c] = n++; }
  let sum = 0; for (let i = 0; i < 10; i++) sum += (/[A-Z]/.test(s[i]) ? values[s[i]] : Number(s[i])) * 2 ** i;
  if (sum % 11 % 10 !== Number(s[10])) throw Error(`Container ${s} fails the ISO 6346 check digit: check the number on the booking`);
  return s;
}
function args(argv) {
  const o = {}, p = [];
  for (const a of argv) {
    if (!a.startsWith('--')) { p.push(a); continue; }
    const i = a.indexOf('='); const k = a.slice(2, i < 0 ? undefined : i);
    if (Object.hasOwn(o, k)) throw Error(`Repeated --${k}`);
    o[k] = i < 0 ? true : a.slice(i + 1);
  }
  return {o, p};
}

// ------------------------------------------------------------------ records

// Exact id, reference or house bill first, then a unique partial match. Ambiguous lists and fails.
export async function resolve(db, kind, search) {
  if (typeof search !== 'string' || !search.trim()) throw Error('Record reference is required');
  const s = search.trim();
  const q = {
    shipments: ['select * from shipments where id::text=lower($1) or lower(reference)=lower($1) or (house_bill<>\'\' and lower(house_bill)=lower($1))',
      'select s.* from shipments s join parties c on c.id=s.customer_id where starts_with(s.id::text,lower($1)) or strpos(lower(s.reference),lower($1))>0 or strpos(lower(c.name),lower($1))>0 order by s.reference', r => `${r.id}  ${r.reference}  ${r.status}`],
    parties: ['select * from parties where id::text=lower($1) or lower(code)=lower($1) or lower(name)=lower($1)',
      'select * from parties where starts_with(id::text,lower($1)) or strpos(lower(name),lower($1))>0 or strpos(lower(code),lower($1))>0 order by code', r => `${r.id}  ${r.code}  ${r.name} (${r.kind})`],
    containers: ['select * from containers where id::text=lower($1) or lower(number)=lower($1)',
      'select * from containers where starts_with(id::text,lower($1)) or strpos(lower(number),lower($1))>0 order by number', r => `${r.id}  ${r.number}`],
  }[kind];
  if (!q) throw Error('Unknown record type');
  const exact = await db.query(q[0], [s]);
  if (exact.length === 1) return exact[0];
  const rows = exact.length > 1 ? exact : await db.query(q[1], [s]);
  if (rows.length === 1) return rows[0];
  throw Error(rows.length ? `Ambiguous ${kind}:\n${rows.map(q[2]).join('\n')}` : `No matching ${kind}: ${s}`);
}
async function party(db, search, kinds, label) {
  const p = await resolve(db, 'parties', search);
  if (kinds && !kinds.includes(p.kind)) throw Error(`${p.name} is a ${p.kind}, not a ${kinds.join(' or ')} (${label})`);
  return p;
}
async function audit(db, kind, ref, actor, action, note = '') { await db.query('insert into activity(record_kind,record_ref,actor,action,note) values($1,$2,$3,$4,$5)', [kind, ref, actor, action, note]); }
async function transaction(db, fn, dry = false) { await db.exec('begin'); try { const r = await fn(); await db.exec(dry ? 'rollback' : 'commit'); return r; } catch (e) { await db.exec('rollback'); throw e; } }
async function insert(db, t, data) { const k = Object.keys(data); return (await db.query(`insert into ${t}(${k.join(',')}) values(${k.map((_, i) => `$${i + 1}`).join(',')}) returning *`, Object.values(data)))[0]; }
async function update(db, t, id, data) { const k = Object.keys(data); if (!k.length) throw Error('No changed fields supplied'); return (await db.query(`update ${t} set ${k.map((c, i) => `${c}=$${i + 1}`).join(',')} where id=$${k.length + 1} returning *`, [...Object.values(data), id]))[0]; }
function writeDraft(prefix, text) { const dir = path.resolve(process.env.OUTPUT_DIR || REPO_ROOT, 'drafts'); fs.mkdirSync(dir, {recursive: true}); const file = path.join(dir, `${prefix}-${today()}-${randomUUID().slice(0, 8)}.md`); fs.writeFileSync(file, text, {flag: 'wx'}); return file; }
const block = rows => '```\n' + human(rows) + '\n```';
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const org = async db => (await db.query('select * from organisation'))[0] || {name: 'Your Business', base_currency: 'AUD', default_free_days: 7};
const open = s => { if (['closed', 'cancelled'].includes(s.status)) throw Error(`${s.reference} is ${s.status}`); };

// Shipment fields shared by book and update-shipment: option -> [column, parser].
const SHIPMENT_FIELDS = {
  operator: ['operator', v => String(v).trim()], incoterm: ['incoterm', v => oneOf(String(v).toUpperCase(), ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'], 'incoterm')],
  etd: ['etd', v => safeDate(v, '--etd', false)], eta: ['eta', v => safeDate(v, '--eta', false)], atd: ['atd', v => safeDate(v, '--atd', false)], ata: ['ata', v => safeDate(v, '--ata', false)],
  voyage: ['voyage', v => String(v).trim()], 'house-bill': ['house_bill', v => String(v).trim()], 'master-bill': ['master_bill', v => String(v).trim()], goods: ['goods', v => String(v).trim()],
  packages: ['packages', v => intIn(v, 0, 1000000, 'packages')], weight: ['weight_kg', v => decimal(v, 'weight')], volume: ['volume_m3', v => decimal(v, 'volume', 3)],
  'customs-value': ['customs_value', v => decimal(v, 'customs-value')], 'doc-cutoff': ['doc_cutoff_at', v => timestamp(v, '--doc-cutoff')], 'cargo-cutoff': ['cargo_cutoff_at', v => timestamp(v, '--cargo-cutoff')],
  'dangerous-goods': ['dangerous_goods', v => bool(v, 'dangerous-goods')], 'bmsb-goods': ['bmsb_target_goods', v => bool(v, 'bmsb-goods')], 'we-report-cargo': ['we_report_cargo', v => bool(v, 'we-report-cargo')],
};

// ------------------------------------------------------------------ import (CargoWise shipment list report)

export const importFields = {
  source_id: ['Shipment ID', 'Shipment Number', 'Job Number', 'Shipment'], house_bill: ['House Bill', 'House Bill Number', 'HBL', 'HAWB'],
  master_bill: ['Master Bill', 'Ocean Bill', 'Master Bill Number', 'MBL', 'MAWB'], customer: ['Local Client', 'Client', 'Consignee', 'Importer'],
  direction: ['Direction', 'Job Direction', 'Shipment Direction'], transport: ['Transport Mode', 'Trans. Mode', 'Mode'], container_mode: ['Container Mode', 'Cont. Mode', 'Cont Mode'],
  origin: ['Origin', 'Origin Port', 'Load Port', 'Port of Loading'], destination: ['Destination', 'Destination Port', 'Discharge Port', 'Port of Discharge'],
  etd: ['ETD'], eta: ['ETA'], atd: ['ATD'], ata: ['ATA'], vessel: ['Vessel', 'Vessel Name'], voyage: ['Voyage', 'Voyage/Flight', 'Flight'],
  goods: ['Goods Description', 'Description'], packages: ['Packages', 'Outer Packs', 'Pieces'], weight: ['Weight', 'Weight (KG)', 'Gross Weight'],
  volume: ['Volume', 'Volume (M3)', 'Cubic Metres'], incoterm: ['INCO Terms', 'Incoterm', 'Incoterms', 'INCO'],
};
const MONTHS = {jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12};
export function importDate(v, label) {
  const s = String(v || '').trim(); if (!s) return null;
  let m = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3})[-\s](\d{2}|\d{4})$/); // CargoWise reports print 12-Oct-26
  if (m && MONTHS[m[2].toLowerCase()]) return safeDate(`${m[3].length === 2 ? '20' + m[3] : m[3]}-${String(MONTHS[m[2].toLowerCase()]).padStart(2, '0')}-${m[1].padStart(2, '0')}`, label, false);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); // day first in NZ and AU
  if (m) return safeDate(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`, label, false);
  return safeDate(s.slice(0, 10), label, false);
}
const number = (v, label) => { const s = String(v || '').replace(/,/g, '').replace(/\s*(kg|m3)$/i, '').trim(); if (!s) return null; if (!/^\d+(\.\d+)?$/.test(s)) throw Error(`${label} must be a number`); return s; };
async function importCargowise(db, o) {
  const actor = required(o, 'actor'), file = required(o, 'file');
  const rows = parseCsv(fs.readFileSync(file, 'utf8')); if (!rows.length) throw Error('CSV has no records');
  let map = {};
  if (o.map) {
    map = JSON.parse(fs.readFileSync(required(o, 'map'), 'utf8'));
    if (!map || typeof map !== 'object' || Array.isArray(map)) throw Error('Column map must be an object');
    for (const [k, v] of Object.entries(map)) if (!(k in importFields) || typeof v !== 'string' || !v.trim()) throw Error(`Unknown or invalid map field: ${k}`);
    for (const column of Object.values(map)) if (!Object.keys(rows[0]).some(k => k.toLowerCase() === column.toLowerCase())) throw Error(`Mapped column missing: ${column}`);
  }
  const seen = new Set(); const input = [];
  for (const [i, row] of rows.entries()) {
    const at = `Row ${i + 2}`;
    const read = k => String(map[k] ? pick(row, map[k]) : pick(row, ...importFields[k])).trim();
    const source_id = read('source_id'), customer = read('customer');
    if (!source_id || !customer) throw Error(`${at}: a shipment ID and client are required; map your headings with --map`);
    if (seen.has(source_id.toLowerCase())) throw Error(`${at}: duplicate shipment ${source_id}`); seen.add(source_id.toLowerCase());
    const dir = read('direction').toLowerCase();
    const direction = /^(imp|import)/.test(dir) ? 'import' : /^(exp|export)/.test(dir) ? 'export' : /^(crt|cross)/.test(dir) ? 'crosstrade' : null;
    if (!direction) throw Error(`${at}: direction must be Import, Export or Cross Trade (IMP, EXP, CRT)`);
    const transport = read('transport').toUpperCase(), cont = read('container_mode').toUpperCase();
    const mode = transport.startsWith('AIR') ? 'air' : transport.startsWith('SEA') ? (cont === 'FCL' ? 'sea-fcl' : 'sea-lcl') : null;
    if (!mode) throw Error(`${at}: transport mode must be SEA or AIR`);
    const origin = read('origin') ? locode(read('origin'), `${at} origin`) : '', destination = read('destination') ? locode(read('destination'), `${at} destination`) : '';
    const inc = read('incoterm').toUpperCase().slice(0, 3);
    const eta = importDate(read('eta'), `${at} ETA`);
    const data = {reference: `CW-${source_id}`, status: 'draft', direction, mode, customer, incoterm: inc ? SHIPMENT_FIELDS.incoterm[1](inc) : '',
      origin_port: origin, origin_country: origin.slice(0, 2), destination_port: destination, destination_country: destination.slice(0, 2),
      house_bill: read('house_bill'), master_bill: read('master_bill'), voyage: [read('vessel'), read('voyage')].filter(Boolean).join(' '),
      etd: importDate(read('etd'), `${at} ETD`), eta, eta_original: eta, atd: importDate(read('atd'), `${at} ATD`), ata: importDate(read('ata'), `${at} ATA`),
      goods: read('goods'), packages: read('packages') ? intIn(read('packages').replace(/,/g, ''), 0, 1000000, `${at} packages`) : null,
      weight_kg: number(read('weight'), `${at} weight`), volume_m3: number(read('volume'), `${at} volume`), source_id,
      source_row: Object.fromEntries(Object.entries(row).sort(([a], [b]) => a.localeCompare(b)))};
    data.source_hash = createHash('sha256').update(JSON.stringify(data)).digest('hex');
    input.push(data);
  }
  return transaction(db, async () => {
    let added = 0, unchanged = 0, customers_added = 0;
    for (const data of input) {
      const old = (await db.query('select source_hash from shipments where source_id=$1', [data.source_id]))[0];
      if (old) { if (old.source_hash !== data.source_hash) throw Error(`Source shipment ${data.source_id} changed since the last import. Reconcile it by hand before re-importing.`); unchanged++; continue; }
      let c = (await db.query("select id from parties where lower(name)=lower($1) and kind='customer'", [data.customer]))[0];
      if (!c) {
        const base = data.customer.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'CUST'; let code = base, n = 1;
        while ((await db.query('select 1 from parties where lower(code)=lower($1)', [code])).length) code = `${base}${++n}`;
        c = await insert(db, 'parties', {code, name: data.customer, kind: 'customer'}); await audit(db, 'party', code, actor, 'import', 'Customer created from the CargoWise import'); customers_added++;
      }
      const {customer, ...rest} = data;
      const s = await insert(db, 'shipments', {...rest, customer_id: c.id}); await audit(db, 'shipment', s.reference, actor, 'import', 'CargoWise shipment imported as a draft; original row kept'); added++;
    }
    return {added, unchanged, customers_added, dry_run: Boolean(o['dry-run'])};
  }, Boolean(o['dry-run']));
}

// ------------------------------------------------------------------ drafts

async function draftStatus(db, o) {
  const c = await party(db, required(o, 'customer'), ['customer'], '--customer'); const g = await org(db);
  const rows = await db.query(`select s.reference, s.house_bill, s.direction, s.mode, s.origin_port || ' > ' || s.destination_port as route, s.voyage, s.etd, s.eta, s.ata, s.status,
      (select string_agg(t.number, ' ' order by t.number) from containers t where t.shipment_id=s.id) as containers,
      (select m.code || ' ' || m.actual_on from milestones m where m.shipment_id=s.id and m.actual_on is not null order by m.actual_on desc limit 1) as last_event
    from shipments s where s.customer_id=$1 and s.status not in ('draft','closed','cancelled') order by coalesce(s.eta, s.etd)`, [c.id]);
  const late = rows.filter(r => r.eta && !r.ata && r.eta < today());
  const line = r => `- ${r.reference}${r.house_bill ? ` (house bill ${r.house_bill})` : ''}: ${r.route}${r.voyage ? ` on ${r.voyage}` : ''}. ${r.ata ? `Arrived ${r.ata}` : r.eta ? `Due ${r.eta}` : 'Arrival to be confirmed'}${r.status === 'cleared' ? ', cleared by customs' : r.status === 'delivered' ? ', delivered' : ''}.${r.containers ? ` Containers ${r.containers}.` : ''}${r.last_event ? ` Last update: ${r.last_event.replace('-', ' ')}.` : ''}`;
  const text = `# Shipment status: ${c.name}\n\nDRAFT. Nothing has been sent. Check each date against the carrier before it goes to ${c.contact || 'the customer'}${c.email ? ` (${c.email})` : ''}.\n\n` +
    `Hi ${c.contact ? c.contact.split(' ')[0] : 'there'},\n\nHere is where your ${rows.length} open shipment${rows.length === 1 ? ' stands' : 's stand'} with ${g.name} today.\n\n${rows.map(line).join('\n')}\n\n` +
    (late.length ? `${late.map(r => r.reference).join(', ')} ${late.length === 1 ? 'is' : 'are'} past the advised ETA. We are chasing the carrier and will confirm the new arrival.\n\n` : '') +
    `Reply with any questions.\n\n[your name]\n${g.name}\n`;
  return {file: writeDraft(`status-${slug(c.code)}`, text), customer: c.name, shipments: rows.length};
}

async function draftArrivalNotice(db, o) {
  const s = await resolve(db, 'shipments', required(o, 'shipment')); if (s.direction !== 'import') throw Error('Arrival notices are for imports');
  const g = await org(db); const c = (await db.query('select * from parties where id=$1', [s.customer_id]))[0];
  const carrier = s.carrier_id ? (await db.query('select name from parties where id=$1', [s.carrier_id]))[0].name : '';
  const boxes = await db.query('select number,size,seal,coalesce(free_days,$2) as free_days from containers where shipment_id=$1 order by number', [s.id, g.default_free_days]);
  const charges = await db.query("select code,description,amount,currency from charges where shipment_id=$1 and side='revenue' order by code", [s.id]);
  const text = `# Arrival notice ${s.reference}\n\nDRAFT. Nothing has been sent. Check the vessel, ETA and charges before it goes to ${c.name}.\n\n` +
    `To: ${c.name}${c.email ? ` (${c.email})` : ''}\nFrom: ${g.name}\n\n| | |\n|---|---|\n| House bill | ${s.house_bill || '[house bill]'} |\n| Carrier and voyage | ${carrier} ${s.voyage} |\n| From | ${s.origin_port} |\n| To | ${s.destination_port} |\n| ETA | ${s.ata || s.eta || '[ETA]'}${s.ata ? ' (arrived)' : ''} |\n| Goods | ${s.goods} |\n| Packages, weight, volume | ${s.packages ?? ''} pk, ${s.weight_kg ?? ''} kg, ${s.volume_m3 ?? ''} m3 |\n\n` +
    `## Containers\n\n${block(boxes)}\n\nFree time runs from the vessel's arrival. Detention is charged from the day after free time ends until the empty is back at the depot.\n\n` +
    `## Charges to collect\n\n${block(charges)}\n\n## What we need from you\n\n- Delivery address and receiving hours\n- Any permit or treatment certificate the goods need\n`;
  return {file: writeDraft(`arrival-notice-${slug(s.reference)}`, text), shipment: s.reference};
}

// ------------------------------------------------------------------ run

const ALLOWED = {
  help: [], shipments: ['status', 'customer', 'direction', 'mode', 'operator'], shipment: ['shipment'], parties: ['kind'], arrivals: ['days'], cutoffs: ['days'], 'free-time': [], exceptions: [], unbilled: [],
  'job-profit': ['since', 'customer', 'below-floor'], 'margin-leaks': ['since'], 'customer-profit': ['since'], 'carrier-reliability': [], bmsb: [], compliance: [], attention: [], 'operator-workload': [],
  activity: ['record'], 'weekly-review': [], 'draft-status': ['customer'], 'draft-arrival-notice': ['shipment'],
  settings: ['name', 'country', 'currency', 'free-days', 'margin-floor', 'invoice-within', 'actor'], 'add-party': ['code', 'name', 'kind', 'email', 'contact', 'actor'],
  book: ['reference', 'direction', 'mode', 'customer', 'carrier', 'agent', 'origin', 'destination', ...Object.keys(SHIPMENT_FIELDS), 'actor'],
  'update-shipment': ['shipment', 'status', 'carrier', 'agent', ...Object.keys(SHIPMENT_FIELDS), 'dg-declaration', 'bmsb-cert', 'actor'],
  'add-container': ['shipment', 'number', 'size', 'seal', 'vgm', 'free-days', 'actor'], 'update-container': ['container', 'seal', 'vgm', 'free-days', 'gate-out', 'empty-returned', 'actor'],
  milestone: ['shipment', 'code', 'planned', 'actual', 'note', 'actor'], 'add-charge': ['shipment', 'side', 'code', 'party', 'amount', 'currency', 'fx', 'description', 'actor'],
  invoice: ['shipment', 'ref', 'date', 'actor'], 'post-cost': ['shipment', 'party', 'ref', 'code', 'date', 'actor'], 'report-cargo': ['shipment', 'at', 'actor'],
  'record-entry': ['shipment', 'entry', 'cleared', 'actor'], deliver: ['shipment', 'date', 'actor'], 'close-job': ['shipment', 'date', 'actor'], cancel: ['shipment', 'reason', 'actor'],
  log: ['record', 'note', 'actor'], import: ['file', 'map', 'dry-run', 'actor'], export: [],
};
const sinceOf = o => safeDate(o.since ?? new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10), 'since', false);

export async function run(db, argv) {
  const {o, p} = args(argv); const command = p[0] || 'help';
  if (!(command in commands)) throw Error(`Unknown command ${command}. Use help.`);
  for (const k of Object.keys(o)) if (k !== 'json' && !ALLOWED[command].includes(k)) throw Error(`Unknown option --${k} for ${command}`);
  for (const k of ['json', 'dry-run', 'below-floor']) if (Object.hasOwn(o, k) && o[k] !== true) throw Error(`--${k} is a bare flag`);
  if (p.length > (command === 'import' ? 2 : 1)) throw Error('Unexpected positional argument');
  const pastOrToday = (v, label) => { const d = safeDate(v ?? today(), label, false); if (d > today()) throw Error(`--${label} cannot be in the future`); return d; };

  switch (command) {
    case 'help': return Object.entries(commands).map(([command, usage]) => ({command, usage}));
    case 'shipments': {
      const w = [], v = [];
      for (const [k, col] of [['status', 'status'], ['direction', 'direction'], ['mode', 'mode'], ['operator', 'operator']]) if (o[k]) { v.push(o[k]); w.push(`lower(${col})=lower($${v.length})`); }
      if (o.customer) { v.push(o.customer); w.push(`strpos(lower(customer),lower($${v.length}))>0`); }
      return db.query(`select reference,status,direction,mode,customer,route,carrier,etd,eta,days_to_eta,containers,teu,profit,margin_pct,operator from shipment_board ${w.length ? 'where ' + w.join(' and ') : ''} order by coalesce(eta,etd),reference`, v);
    }
    case 'shipment': {
      const s = await resolve(db, 'shipments', required(o, 'shipment'));
      const names = await db.query('select id,name from parties where id = any($1::uuid[])', [[s.customer_id, s.carrier_id, s.agent_id].filter(Boolean)]);
      const name = id => names.find(n => n.id === id)?.name || '';
      return {shipment: {reference: s.reference, status: s.status, direction: s.direction, mode: s.mode, customer: name(s.customer_id), carrier: name(s.carrier_id), agent: name(s.agent_id), operator: s.operator, incoterm: s.incoterm,
          route: `${s.origin_port} > ${s.destination_port}`, house_bill: s.house_bill, master_bill: s.master_bill, voyage: s.voyage, etd: s.etd, eta: s.eta, first_eta: s.eta_original, atd: s.atd, ata: s.ata,
          goods: s.goods, cargo_reported_at: s.cargo_reported_at, entry_number: s.entry_number, cleared_on: s.cleared_on, delivered_on: s.delivered_on},
        containers: await db.query('select number,size,seal,vgm_kg,free_days,gate_out_on,empty_returned_on from containers where shipment_id=$1 order by number', [s.id]),
        milestones: await db.query('select code,planned_on,actual_on,note from milestones where shipment_id=$1 order by coalesce(actual_on,planned_on)', [s.id]),
        charges: await db.query('select x.side,x.code,x.description,p.name as party,x.amount,x.currency,x.fx_rate,x.status,x.invoice_ref from charges x join parties p on p.id=x.party_id where x.shipment_id=$1 order by x.side desc,x.code', [s.id]),
        profit: await db.query('select revenue,cost,profit,margin_pct,unbilled,accrued from job_profit where id=$1', [s.id]),
        findings: await db.query('select severity,rule,finding from compliance_findings where reference=$1 or reference like $2 order by severity', [s.reference, `${s.reference}/%`]),
        activity: await db.query("select created_at,actor,action,note from activity where record_kind='shipment' and record_ref=$1 order by created_at desc,id desc", [s.reference])};
    }
    case 'parties': return o.kind ? db.query('select code,name,kind,email,contact from parties where kind=$1 order by code', [oneOf(o.kind, ['customer', 'carrier', 'agent', 'trucker', 'supplier'], 'kind')]) : db.query('select code,name,kind,email,contact from parties order by kind,code');
    case 'arrivals': return db.query('select reference,customer,mode,voyage,destination_port as port,eta,ata,days_to_arrival,cargo_reported_at is not null as cargo_reported,entry_number,cleared_on,containers from arrival_queue where days_to_arrival<=$1 order by coalesce(ata,eta),reference', [days(o, 14)]);
    case 'cutoffs': return db.query("select reference,customer,mode,voyage,to_char(doc_cutoff_at,'YYYY-MM-DD HH24:MI') as doc_cutoff,to_char(cargo_cutoff_at,'YYYY-MM-DD HH24:MI') as cargo_cutoff,etd,containers_without_vgm,dg_declaration_missing,docs_received_on from cutoff_queue where coalesce(cargo_cutoff_at,doc_cutoff_at,etd::timestamptz) < now()+($1::int * interval '1 day') order by coalesce(doc_cutoff_at,cargo_cutoff_at,etd::timestamptz)", [days(o, 7)]);
    case 'free-time': return db.query('select shipment,number,size,customer,ata,free_days,free_until,days_left,gate_out_on from container_free_time order by days_left,shipment,number');
    case 'exceptions': return db.query('select shipment,customer,operator,milestone,planned_on,days_late from milestone_exceptions order by days_late desc,shipment');
    case 'unbilled': return db.query("select reference,customer,operator,delivered_on,current_date-delivered_on as days_since_delivery,revenue,unbilled,cost,profit from job_profit where delivered_on is not null and closed_on is null and (unbilled>0 or revenue=0) order by delivered_on,reference");
    case 'job-profit': {
      const v = [sinceOf(o)]; let w = 'where coalesce(delivered_on, current_date) >= $1';
      if (o.customer) { v.push(o.customer); w += ` and strpos(lower(customer),lower($${v.length}))>0`; }
      if (o['below-floor']) w += ' and margin_pct < (select margin_floor_pct from organisation)';
      return db.query(`select reference,status,customer,operator,revenue,cost,profit,margin_pct,unbilled,accrued,delivered_on,closed_on from job_profit ${w} order by margin_pct nulls first,reference`, v);
    }
    case 'margin-leaks': return db.query('select u.shipment,u.status,u.customer,u.code,u.description,u.supplier,u.cost from unrecovered_costs u join shipments s on s.reference=u.shipment where coalesce(s.delivered_on, current_date) >= $1 order by u.cost desc,u.shipment', [sinceOf(o)]);
    case 'customer-profit': return db.query(`select p.customer,count(*)::int as jobs,coalesce(sum(b.teu),0)::int as teu,sum(p.revenue) as revenue,sum(p.profit) as profit,
        case when sum(p.revenue)>0 then round(100*sum(p.profit)/sum(p.revenue),1) end as margin_pct,round(avg(p.profit),2) as profit_per_job,sum(p.unbilled) as unbilled
      from job_profit p left join lateral (select sum(case when t.size like '20%' then 1 else 2 end) as teu from containers t where t.shipment_id=p.id) b on true
      where coalesce(p.delivered_on, current_date) >= $1 group by p.customer order by margin_pct nulls first,p.customer`, [sinceOf(o)]);
    case 'carrier-reliability': return db.query(`select k.name as carrier,count(*)::int as shipments,count(s.ata)::int as arrived,
        round(avg(coalesce(s.ata,s.eta)-s.eta_original),1) as avg_slip_days,max(coalesce(s.ata,s.eta)-s.eta_original) as worst_slip_days,
        count(*) filter (where coalesce(s.ata,s.eta)-s.eta_original>=3)::int as slipped_3_days_or_more
      from shipments s join parties k on k.id=s.carrier_id where s.eta_original is not null and s.status not in ('draft','cancelled') group by k.name order by avg_slip_days desc,k.name`);
    case 'bmsb': return db.query(`select s.reference,c.name as customer,s.origin_port,s.destination_port,coalesce(s.atd,s.etd) as shipped_on,s.goods,
        s.bmsb_target_goods as target_goods,b.code is not null as target_country,
        extract(month from coalesce(s.atd,s.etd)) in (9,10,11,12,1,2,3,4) as in_season,nullif(s.bmsb_treatment_cert,'') as treatment_cert
      from shipments s join parties c on c.id=s.customer_id left join bmsb_countries b on b.code=s.origin_country
      where s.direction='import' and s.destination_country in ('AU','NZ') and s.mode<>'air' and s.status not in ('closed','cancelled') and (b.code is not null or s.bmsb_target_goods)
      order by (b.code is not null and s.bmsb_target_goods and s.bmsb_treatment_cert='') desc,shipped_on`);
    case 'compliance': return db.query('select severity,kind,reference,rule,finding from compliance_findings order by severity,rule,reference');
    case 'attention': return db.query(`select * from (
        select 'finding' as what, reference, rule || ': ' || finding as why, severity from compliance_findings where severity<=2
        union all select 'milestone', shipment, milestone || ' planned ' || planned_on || ', ' || days_late || case when days_late = 1 then ' day' else ' days' end || ' late (' || coalesce(nullif(operator,''),'no operator') || ')', 2 from milestone_exceptions
        union all select 'operator', reference, 'Open job with no operator', 2 from shipments where btrim(operator)='' and status not in ('closed','cancelled')
      ) x order by severity,what,reference`);
    case 'operator-workload': return db.query(`select coalesce(nullif(s.operator,''),'(none)') as operator,count(*)::int as open_jobs,
        (select count(*) from compliance_findings f join shipments x on f.reference=x.reference or f.reference like x.reference || '/%' where x.operator=s.operator and f.severity<=2)::int as findings,
        (select count(*) from milestone_exceptions m where m.operator=s.operator)::int as late_milestones,
        (select count(*) from job_profit j where j.operator=s.operator and j.delivered_on is not null and j.closed_on is null and (j.unbilled>0 or j.revenue=0))::int as unbilled_jobs
      from shipments s where s.status not in ('closed','cancelled') group by s.operator order by findings desc,operator`);
    case 'activity': return o.record ? db.query('select created_at,record_kind,record_ref,actor,action,note from activity where lower(record_ref)=lower($1) order by created_at desc,id desc', [String(o.record)]) : db.query('select created_at,record_kind,record_ref,actor,action,note from activity order by created_at desc,id desc limit 50');
    case 'weekly-review': {
      const out = {};
      for (const c of ['compliance', ['arrivals', '--days=7'], ['cutoffs', '--days=7'], 'free-time', 'unbilled', 'exceptions']) { const a = [].concat(c); out[a[0]] = await run(db, a); }
      return out;
    }
    case 'draft-status': return draftStatus(db, o);
    case 'draft-arrival-notice': return draftArrivalNotice(db, o);
    case 'import': if (p[1] !== 'cargowise') throw Error('Supported import: cargowise'); return importCargowise(db, o);
    case 'export': {
      const backup = {format: 'freight-forwarding-for-claude-code/v1', exported_at: new Date().toISOString(), records: {}};
      for (const t of ['organisation', 'parties', 'bmsb_countries', 'charge_codes', 'shipments', 'containers', 'milestones', 'charges', 'activity']) backup.records[t] = await db.query(`select * from ${t}`);
      const dir = path.resolve(process.env.OUTPUT_DIR || REPO_ROOT, 'exports'); fs.mkdirSync(dir, {recursive: true});
      const file = path.join(dir, `forwarding-${today()}-${randomUUID().slice(0, 8)}.json`); fs.writeFileSync(file, JSON.stringify(backup, null, 2) + '\n', {flag: 'wx'});
      return {file, shipments: backup.records.shipments.length, charges: backup.records.charges.length};
    }
    case 'settings': {
      const changes = {};
      if (o.name !== undefined) changes.name = required(o, 'name');
      if (o.country !== undefined) changes.country = oneOf(String(o.country).toUpperCase(), ['AU', 'NZ'], 'country');
      if (o.currency !== undefined) changes.base_currency = currency(o.currency);
      if (o['free-days'] !== undefined) changes.default_free_days = intIn(o['free-days'], 0, 60, 'free-days');
      if (o['margin-floor'] !== undefined) changes.margin_floor_pct = intIn(o['margin-floor'], 0, 100, 'margin-floor');
      if (o['invoice-within'] !== undefined) changes.invoice_within_days = intIn(o['invoice-within'], 0, 60, 'invoice-within');
      if (!Object.keys(changes).length) return db.query('select name,country,base_currency,default_free_days,margin_floor_pct,invoice_within_days from organisation');
      const actor = required(o, 'actor');
      return transaction(db, async () => { await db.query('insert into organisation(id) values(true) on conflict do nothing'); const r = await update(db, 'organisation', true, changes); await audit(db, 'organisation', r.name, actor, 'settings', JSON.stringify(changes)); return r; });
    }
  }

  // Everything below writes, in one transaction, with the actor on the activity log.
  const actor = required(o, 'actor');
  return transaction(db, async () => {
    switch (command) {
      case 'add-party': {
        const r = await insert(db, 'parties', {code: required(o, 'code').toUpperCase(), name: required(o, 'name'), kind: oneOf(required(o, 'kind'), ['customer', 'carrier', 'agent', 'trucker', 'supplier'], 'kind'), email: o.email ? String(o.email).trim() : '', contact: o.contact ? String(o.contact).trim() : ''});
        await audit(db, 'party', r.code, actor, command, `${r.name} (${r.kind})`); return r;
      }
      case 'book': {
        const d = {reference: required(o, 'reference').toUpperCase(), status: 'booked', direction: oneOf(required(o, 'direction'), ['import', 'export', 'crosstrade'], 'direction'), mode: oneOf(required(o, 'mode'), ['sea-fcl', 'sea-lcl', 'air'], 'mode'),
          customer_id: (await party(db, required(o, 'customer'), ['customer'], '--customer')).id};
        if (o.carrier) d.carrier_id = (await party(db, required(o, 'carrier'), ['carrier'], '--carrier')).id;
        if (o.agent) d.agent_id = (await party(db, required(o, 'agent'), ['agent'], '--agent')).id;
        if (o.origin) { d.origin_port = locode(o.origin, 'origin'); d.origin_country = d.origin_port.slice(0, 2); }
        if (o.destination) { d.destination_port = locode(o.destination, 'destination'); d.destination_country = d.destination_port.slice(0, 2); }
        for (const [k, [col, parse]] of Object.entries(SHIPMENT_FIELDS)) if (o[k] !== undefined) d[col] = parse(o[k]);
        if (d.eta) d.eta_original = d.eta;
        if (d.etd && d.eta && d.eta < d.etd) throw Error('--eta cannot be before --etd');
        const s = await insert(db, 'shipments', d); await audit(db, 'shipment', s.reference, actor, command, `${s.direction} ${s.mode} ${s.origin_port} > ${s.destination_port}`); return s;
      }
      case 'update-shipment': {
        const s = await resolve(db, 'shipments', required(o, 'shipment')); open(s); const d = {};
        if (o.carrier !== undefined) d.carrier_id = (await party(db, required(o, 'carrier'), ['carrier'], '--carrier')).id;
        if (o.agent !== undefined) d.agent_id = (await party(db, required(o, 'agent'), ['agent'], '--agent')).id;
        for (const [k, [col, parse]] of Object.entries(SHIPMENT_FIELDS)) if (o[k] !== undefined) d[col] = parse(o[k]);
        if (o['dg-declaration'] !== undefined) d.dg_declaration_on = pastOrToday(o['dg-declaration'], 'dg-declaration');
        if (o['bmsb-cert'] !== undefined) d.bmsb_treatment_cert = required(o, 'bmsb-cert');
        for (const k of ['atd', 'ata']) if (d[k] && d[k] > today()) throw Error(`--${k} cannot be in the future`);
        if (o.status !== undefined) {
          d.status = oneOf(o.status, ['booked', 'in-transit', 'arrived'], 'status');
          if (s.status === 'draft' && d.status !== 'booked') throw Error('Book an imported draft first: --status=booked');
        } else if (d.ata && ['booked', 'in-transit'].includes(s.status)) d.status = 'arrived';
        else if (d.atd && s.status === 'booked') d.status = 'in-transit';
        if (s.status === 'draft' && d.status === 'booked' && !s.eta_original && (d.eta || s.eta)) d.eta_original = d.eta || s.eta;
        if (!s.eta_original && d.eta) d.eta_original = d.eta;
        const u = await update(db, 'shipments', s.id, d);
        if (u.etd && u.eta && u.eta < u.etd) throw Error('ETA cannot be before ETD');
        if (u.ata && (u.atd || u.etd) && u.ata < (u.atd || u.etd)) throw Error('Arrival cannot be before departure');
        if (d.atd) await db.query("insert into milestones(shipment_id,code,actual_on) values($1,'departed',$2) on conflict (shipment_id,code) do update set actual_on=excluded.actual_on", [s.id, d.atd]);
        if (d.ata) await db.query("insert into milestones(shipment_id,code,actual_on) values($1,'arrived',$2) on conflict (shipment_id,code) do update set actual_on=excluded.actual_on", [s.id, d.ata]);
        await audit(db, 'shipment', s.reference, actor, command, JSON.stringify({before: Object.fromEntries(Object.keys(d).map(k => [k, s[k]])), after: d})); return u;
      }
      case 'add-container': {
        const s = await resolve(db, 'shipments', required(o, 'shipment')); open(s); if (s.mode === 'air') throw Error('Air shipments carry no containers');
        const c = await insert(db, 'containers', {shipment_id: s.id, number: containerNumber(required(o, 'number')), size: oneOf(String(o.size ?? '40HC').toUpperCase(), ['20GP', '40GP', '40HC', '20RF', '40RF', '20OT', '40OT', '20FR', '40FR', '45HC'], 'size'),
          seal: o.seal ? String(o.seal).trim() : '', vgm_kg: o.vgm ? decimal(o.vgm, 'vgm', 1) : null, vgm_at: o.vgm ? new Date().toISOString() : null, free_days: o['free-days'] !== undefined ? intIn(o['free-days'], 0, 60, 'free-days') : null});
        await audit(db, 'shipment', s.reference, actor, command, `${c.number} ${c.size}`); return c;
      }
      case 'update-container': {
        const c = await resolve(db, 'containers', required(o, 'container')); const s = (await db.query('select * from shipments where id=$1', [c.shipment_id]))[0]; open(s); const d = {};
        if (o.seal !== undefined) d.seal = required(o, 'seal');
        if (o.vgm !== undefined) { d.vgm_kg = decimal(o.vgm, 'vgm', 1); d.vgm_at = new Date().toISOString(); }
        if (o['free-days'] !== undefined) d.free_days = intIn(o['free-days'], 0, 60, 'free-days');
        if (o['gate-out'] !== undefined) d.gate_out_on = pastOrToday(o['gate-out'], 'gate-out');
        if (o['empty-returned'] !== undefined) { d.empty_returned_on = pastOrToday(o['empty-returned'], 'empty-returned'); if (s.ata && d.empty_returned_on < s.ata) throw Error('The empty cannot be returned before the vessel arrived'); }
        const u = await update(db, 'containers', c.id, d); await audit(db, 'shipment', s.reference, actor, command, `${c.number} ${JSON.stringify(d)}`); return u;
      }
      case 'milestone': {
        const s = await resolve(db, 'shipments', required(o, 'shipment')); open(s);
        const code = oneOf(required(o, 'code'), ['booking-confirmed', 'docs-received', 'cargo-ready', 'gate-in', 'departed', 'arrived', 'customs-cleared', 'delivered', 'pod-received'], 'code');
        if (o.planned === undefined && o.actual === undefined) throw Error('Give --planned or --actual');
        const planned = o.planned !== undefined ? safeDate(o.planned, '--planned', false) : null, actual = o.actual !== undefined ? pastOrToday(o.actual, 'actual') : null;
        const m = (await db.query(`insert into milestones(shipment_id,code,planned_on,actual_on,note) values($1,$2,$3,$4,$5)
          on conflict (shipment_id,code) do update set planned_on=coalesce($3,milestones.planned_on), actual_on=coalesce($4,milestones.actual_on), note=case when $5='' then milestones.note else $5 end returning *`, [s.id, code, planned, actual, o.note ? String(o.note) : '']))[0];
        await audit(db, 'shipment', s.reference, actor, command, `${code}${planned ? ' planned ' + planned : ''}${actual ? ' actual ' + actual : ''}`); return m;
      }
      case 'add-charge': {
        const s = await resolve(db, 'shipments', required(o, 'shipment')); open(s);
        const side = oneOf(required(o, 'side'), ['cost', 'revenue'], 'side'); const code = required(o, 'code').toUpperCase();
        if (!(await db.query('select 1 from charge_codes where code=$1', [code])).length) throw Error(`Unknown charge code ${code}. Known: ${(await db.query('select code from charge_codes order by code')).map(r => r.code).join(', ')}`);
        const pt = await party(db, required(o, 'party'), side === 'revenue' ? ['customer'] : ['carrier', 'agent', 'trucker', 'supplier'], '--party');
        const cur = currency(required(o, 'currency')); const base = (await org(db)).base_currency;
        if (cur !== base && o.fx === undefined) throw Error(`--fx is required for ${cur}: the rate that converts it to ${base}`);
        const x = await insert(db, 'charges', {shipment_id: s.id, side, code, party_id: pt.id, amount: decimal(required(o, 'amount'), 'amount'), currency: cur, fx_rate: o.fx !== undefined ? decimal(o.fx, 'fx', 6) : '1', description: o.description ? String(o.description) : ''});
        if (Number(x.fx_rate) <= 0) throw Error('--fx must be above zero');
        await audit(db, 'shipment', s.reference, actor, command, `${side} ${code} ${x.amount} ${cur} ${pt.name}`); return x;
      }
      case 'invoice': {
        const s = await resolve(db, 'shipments', required(o, 'shipment')); open(s); const on = pastOrToday(o.date, 'date');
        const rows = await db.query("update charges set status='invoiced',invoice_ref=$2,invoiced_on=$3 where shipment_id=$1 and side='revenue' and status='open' returning code,amount,currency", [s.id, required(o, 'ref'), on]);
        if (!rows.length) throw Error(`No open revenue on ${s.reference}: add the charges first with add-charge`);
        await audit(db, 'shipment', s.reference, actor, command, `${o.ref}: ${rows.map(r => `${r.code} ${r.amount} ${r.currency}`).join(', ')}`); return {shipment: s.reference, invoice: o.ref, lines: rows.length};
      }
      case 'post-cost': {
        const s = await resolve(db, 'shipments', required(o, 'shipment')); const pt = await party(db, required(o, 'party'), null, '--party'); const on = pastOrToday(o.date, 'date');
        const v = [s.id, pt.id, required(o, 'ref'), on]; let w = ''; if (o.code) { v.push(String(o.code).toUpperCase()); w = ' and code=$5'; }
        const rows = await db.query(`update charges set status='posted',invoice_ref=$3,invoiced_on=$4 where shipment_id=$1 and party_id=$2 and side='cost' and status='open'${w} returning code,amount,currency`, v);
        if (!rows.length) throw Error(`No open costs from ${pt.name} on ${s.reference}${o.code ? ` under ${o.code}` : ''}`);
        await audit(db, 'shipment', s.reference, actor, command, `${o.ref} from ${pt.name}: ${rows.map(r => `${r.code} ${r.amount} ${r.currency}`).join(', ')}`); return {shipment: s.reference, supplier_invoice: o.ref, lines: rows.length};
      }
      case 'report-cargo': {
        const s = await resolve(db, 'shipments', required(o, 'shipment')); open(s); if (s.direction !== 'import') throw Error('Cargo reports are for imports');
        const at = timestamp(required(o, 'at'), '--at'); if (Date.parse(at) > Date.now() + 60e3) throw Error('--at cannot be in the future');
        const u = await update(db, 'shipments', s.id, {cargo_reported_at: at}); await audit(db, 'shipment', s.reference, actor, command, `House cargo report lodged ${at}`); return u;
      }
      case 'record-entry': {
        const s = await resolve(db, 'shipments', required(o, 'shipment')); open(s); if (s.direction !== 'import') throw Error('Import declarations are for imports');
        const d = {entry_number: required(o, 'entry')};
        if (o.cleared !== undefined) { d.cleared_on = pastOrToday(o.cleared, 'cleared'); if (['booked', 'in-transit', 'arrived'].includes(s.status)) d.status = 'cleared'; }
        const u = await update(db, 'shipments', s.id, d);
        if (d.cleared_on) await db.query("insert into milestones(shipment_id,code,actual_on) values($1,'customs-cleared',$2) on conflict (shipment_id,code) do update set actual_on=excluded.actual_on", [s.id, d.cleared_on]);
        await audit(db, 'shipment', s.reference, actor, command, `${d.entry_number}${d.cleared_on ? ' cleared ' + d.cleared_on : ''}`); return u;
      }
      case 'deliver': {
        const s = await resolve(db, 'shipments', required(o, 'shipment')); open(s); if (s.status === 'draft') throw Error('Book the imported draft first');
        if (!s.ata) throw Error('Record the arrival first (update-shipment --ata)'); if (s.delivered_on) throw Error('Already delivered');
        if (s.direction === 'import' && s.destination_country === 'AU' && Number(s.customs_value) > 1000 && !s.entry_number) throw Error('No import declaration recorded: record-entry first');
        const on = pastOrToday(o.date, 'date'); if (on < s.ata) throw Error('Delivery cannot be before arrival');
        const u = await update(db, 'shipments', s.id, {status: 'delivered', delivered_on: on});
        await db.query("insert into milestones(shipment_id,code,actual_on) values($1,'delivered',$2) on conflict (shipment_id,code) do update set actual_on=excluded.actual_on", [s.id, on]);
        await audit(db, 'shipment', s.reference, actor, command, `Delivered ${on}`); return u;
      }
      case 'close-job': {
        const s = await resolve(db, 'shipments', required(o, 'shipment')); open(s);
        if (!s.delivered_on && !(s.direction !== 'import' && s.atd)) throw Error('Deliver the job first (or record departure for an export)');
        const p0 = (await db.query('select * from job_profit where id=$1', [s.id]))[0];
        if (Number(p0.revenue) === 0) throw Error('No revenue charged on this job: add-charge and invoice before closing');
        if (Number(p0.unbilled) > 0) throw Error(`${p0.unbilled} of revenue is not invoiced`);
        if (Number(p0.accrued) > 0) throw Error(`${p0.accrued} of costs still accrued: post the supplier invoices first`);
        const boxes = await db.query("select number from containers where shipment_id=$1 and empty_returned_on is null and $2='import'", [s.id, s.direction]);
        if (boxes.length) throw Error(`Containers not returned: ${boxes.map(b => b.number).join(', ')}`);
        const u = await update(db, 'shipments', s.id, {status: 'closed', closed_on: pastOrToday(o.date, 'date')});
        await audit(db, 'shipment', s.reference, actor, command, `Closed: profit ${p0.profit}, margin ${p0.margin_pct}%`); return u;
      }
      case 'cancel': {
        const s = await resolve(db, 'shipments', required(o, 'shipment')); open(s);
        const billed = await db.query("select invoice_ref from charges where shipment_id=$1 and status<>'open'", [s.id]);
        if (billed.length) throw Error(`Invoices already raised or posted (${billed.map(b => b.invoice_ref).join(', ')}): credit them before cancelling`);
        const u = await update(db, 'shipments', s.id, {status: 'cancelled'}); await audit(db, 'shipment', s.reference, actor, command, required(o, 'reason')); return u;
      }
      case 'log': {
        const ref = required(o, 'record');
        for (const [t, col, kind] of [['shipments', 'reference', 'shipment'], ['parties', 'code', 'party']]) { const hit = await db.query(`select ${col} as ref from ${t} where lower(${col})=lower($1)`, [ref]); if (hit.length === 1) { await audit(db, kind, hit[0].ref, actor, 'note', required(o, 'note')); return {record: hit[0].ref, recorded: true}; } }
        throw Error(`No record with reference ${ref}`);
      }
    }
    throw Error(`Unimplemented command ${command}`);
  });
}

// ------------------------------------------------------------------ output

const HIDE = ['id', 'shipment_id', 'customer_id', 'carrier_id', 'agent_id', 'party_id', 'source_row', 'source_hash', 'created_at', 'updated_at'];
export function human(result) {
  if (Array.isArray(result)) {
    if (!result.length) return '  (none)';
    const cols = Object.keys(result[0]).filter(k => !HIDE.includes(k));
    return table(result, cols.map(key => ({key, label: key, width: 72, format: v => v instanceof Date ? v.toISOString().slice(0, 16).replace('T', ' ') : v && typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')})));
  }
  if (result && typeof result === 'object') return Object.entries(result).map(([k, v]) => v && typeof v === 'object' && !(v instanceof Date) ? `${k}\n${human(Array.isArray(v) ? v : [v])}` : `${k}: ${v ?? ''}`).join('\n\n');
  return String(result);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  let db;
  try { db = await getDb(); const result = await run(db, process.argv.slice(2)); console.log(process.argv.includes('--json') ? JSON.stringify(result, null, 2) : human(result)); }
  catch (e) { console.error(e.message); process.exitCode = 1; }
  finally { if (db) await db.close(); }
}
