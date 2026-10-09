// npm test: a temporary database, migrate, seed twice, every command, the rules, the import and the
// rendered pages. Set TEST_DATABASE_URL to run the same checks against a new, empty Postgres.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {getDb, REPO_ROOT} from './lib/db.mjs';
import {migrate} from './migrate.mjs';
import {seed} from './seed.mjs';
import {run, commands, resolve, date, timestamp, human, containerNumber, locode, importDate} from './forwarding.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forwarding-test-'));
process.env.DATA_DIR = path.join(dir, 'db'); process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || ''; process.env.OUTPUT_DIR = dir;
let db; const visited = new Set();
const call = async (c, o = {}, p = []) => { visited.add(c); return run(db, [c, ...p, ...Object.entries(o).map(([k, v]) => v === true ? `--${k}` : `--${k}=${v}`)]); };
const fails = (c, o, re, p = []) => assert.rejects(() => call(c, o, p), re);
const shell = (file, argv = []) => { const r = spawnSync(process.execPath, [path.join(REPO_ROOT, 'scripts', file), ...argv], {cwd: REPO_ROOT, env: process.env, encoding: 'utf8'}); assert.equal(r.status, 0, r.stderr || r.stdout); return r.stdout; };
const find = (rows, ref, key = 'reference') => rows.find(r => r[key] === ref);
const day = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const stamp = hours => new Date(Date.now() + hours * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
const inSeason = d => [9, 10, 11, 12, 1, 2, 3, 4].includes(Number(d.slice(5, 7)));
const has = async (ref, rule, severity) => (await call('compliance')).some(r => r.reference === ref && r.rule === rule && (severity === undefined || r.severity === severity));
const actor = 'Test operator';

try {
  db = await getDb();
  if (db.mode === 'postgres') assert.equal((await db.query("select tablename from pg_tables where schemaname='public'")).length, 0, 'TEST_DATABASE_URL must be a new, empty, disposable database');
  assert.equal((await migrate(db)).ran.length, 1); assert.equal((await migrate(db)).ran.length, 0);
  await seed(db); await seed(db);

  // ---- reads on the demo data
  assert.equal((await call('help')).length, Object.keys(commands).length);
  const board = await call('shipments'); assert.equal(board.length, 8); assert(!find(board, 'S1008'), 'closed jobs leave the board');
  assert.equal(find(board, 'S1002').teu, 3); assert.equal(Number(find(board, 'S1002').profit), 1051);
  assert.equal((await call('shipments', {customer: 'northside'})).length, 2); assert.equal((await call('shipments', {direction: 'export', operator: 'ben'})).length, 1);
  assert.equal((await call('parties', {kind: 'carrier'})).length, 4); assert.equal((await call('parties')).length, 13);
  const arr = await call('arrivals'); assert.deepEqual(arr.map(r => r.reference), ['S1007', 'S1002', 'S1009', 'S1001', 'S1004']);
  assert.equal((await call('arrivals', {days: '0'})).length, 3);
  const cut = await call('cutoffs'); assert.equal(find(cut, 'S1005').containers_without_vgm, 1); assert.equal(find(cut, 'S1006').dg_declaration_missing, true);
  const free = await call('free-time'); assert.equal(free.length, 2); assert.equal(free[0].number, 'MSKU7654333'); assert.equal(free[0].days_left, -1);
  assert.equal((await call('exceptions')).length, 4);
  const unb = await call('unbilled'); assert.deepEqual(unb.map(r => r.reference), ['S1003']); assert.equal(unb[0].days_since_delivery, 9);
  assert.deepEqual((await call('job-profit', {'below-floor': true})).map(r => r.reference), ['S1008', 'S0990']);
  assert.equal(Number(find(await call('job-profit', {customer: 'murray'}), 'S1001').margin_pct), 18.6);
  assert.deepEqual((await call('margin-leaks')).map(r => `${r.shipment}/${r.code}`), ['S1007/FUM', 'S0990/DET', 'S1003/DEL']);
  assert.equal(Number(find(await call('customer-profit'), 'Northside Homewares', 'customer').margin_pct), 26.4);
  const rel = await call('carrier-reliability'); assert.equal(rel[0].carrier, 'Hapag-Lloyd'); assert.equal(Number(rel[0].avg_slip_days), 3); assert.equal(rel[0].worst_slip_days, 5);
  const bm = await call('bmsb'); assert.equal(find(bm, 'S1001').target_country, true); assert.equal(find(bm, 'S1007').treatment_cert, 'FUM-ESVLC-77812');
  const rules = await call('compliance');
  for (const [ref, rule, sev] of [['S1001', 'AU-ICS-64AB', 1], ['S1004', 'AU-ICS-64AB', 2], ['S1001', 'AU-DECL-68', 2], ['S1007', 'NZ-DECL-20', 1], ['S1006', 'DG-DECLARATION', 1], ['S1005/MSKU2210995', 'SOLAS-VGM', 2],
    ['S1002/MSKU7654333', 'POLICY-FREE-TIME', 1], ['S1002/MSKU7654328', 'POLICY-FREE-TIME', 2], ['S1003', 'POLICY-UNBILLED', 1], ['S1003', 'POLICY-UNRECOVERED', 2], ['S1007', 'POLICY-UNRECOVERED', 2], ['S1009', 'POLICY-ETA', 2], ['S1008', 'POLICY-MARGIN', 3]])
    assert(rules.some(r => r.reference === ref && r.rule === rule && r.severity === sev), `${ref} ${rule} ${sev}`);
  assert.equal(rules.some(r => r.reference === 'S1001' && r.rule === 'BMSB-SEASON'), inSeason(day(-20)), 'BMSB only for sailings 1 September to 30 April');
  assert(!rules.some(r => r.reference === 'S1004' && r.rule === 'AU-DECL-68'), 'goods under AUD 1,000 need no full declaration');
  assert(!rules.some(r => r.reference === 'S1007' && r.rule === 'BMSB-SEASON'), 'treated cargo is clear');
  assert(!rules.some(r => r.reference === 'S0990'), 'closed jobs out of time raise nothing');
  assert(!rules.some(r => r.reference === 'S1009' && r.rule === 'AU-ICS-64AB'), 'reported cargo is clear');
  const att = await call('attention'); assert.equal(att[0].severity, 1); assert(att.some(r => r.what === 'milestone' && r.reference === 'S1003'));
  assert(!att.some(r => r.severity === 3));
  const work = await call('operator-workload'); assert.equal(find(work, 'Ben', 'operator').late_milestones, 3); assert.equal(find(work, 'Ben', 'operator').unbilled_jobs, 1);
  assert((await call('activity')).length >= 1); assert.equal((await call('activity', {record: 's1002'})).length, 1);
  const weekly = await call('weekly-review'); assert.deepEqual(Object.keys(weekly), ['compliance', 'arrivals', 'cutoffs', 'free-time', 'unbilled', 'exceptions']);
  const one = await call('shipment', {shipment: 'SCF1003'}); assert.equal(one.shipment.reference, 'S1003'); assert.equal(one.charges.length, 5); assert.equal(one.findings.length, 2);
  assert.equal((await call('shipment', {shipment: 'S1002'})).findings.length, 2, 'container findings roll up to the job');
  assert.equal((await resolve(db, 'shipments', 'a0000000-0000-0000-0000-000000001001')).reference, 'S1001');
  await assert.rejects(() => resolve(db, 'shipments', 'S100'), /Ambiguous[\s\S]*S1001[\s\S]*S1002/);
  await assert.rejects(() => resolve(db, 'shipments', 'coastline'), /Ambiguous[\s\S]*S1003[\s\S]*S1008/);
  await assert.rejects(() => resolve(db, 'shipments', "%' or true --"), /No matching/);
  assert.equal((await call('settings'))[0].name, 'Southern Cross Forwarding');

  // ---- input checks
  assert.throws(() => date('2026-02-30'), /real ISO/); assert.throws(() => timestamp('tomorrow', '--at'), /YYYY-MM-DD/);
  assert.equal(timestamp('2026-10-01 09:30+11:00', 'x'), '2026-09-30T22:30:00.000Z');
  assert.equal(containerNumber('cs qu 305438 3'), 'CSQU3054383'); assert.throws(() => containerNumber('CSQU3054384'), /check digit/); assert.throws(() => containerNumber('CSQ3054383'), /four letters/);
  assert.equal(locode('aumel', 'x'), 'AUMEL'); assert.throws(() => locode('Melbourne', 'origin'), /UN\/LOCODE/);
  assert.equal(importDate('12-Oct-26', 'x'), '2026-10-12'); assert.equal(importDate('05/11/2026', 'x'), '2026-11-05'); assert.throws(() => importDate('31-Feb-26', 'x'), /real ISO/);
  await fails('shipments', {typo: true}, /Unknown option/); await fails('shipments', {json: 'false'}, /bare flag/);
  await fails('arrivals', {days: '-1'}, /whole number/); await fails('nope', {}, /Unknown command/);

  // ---- an import from booking to closed, and the rules it meets on the way
  await call('add-party', {code: 'tstimp', name: 'Test Importer <script>alert(1)</script>', kind: 'customer', email: 'ops@test.example', actor});
  await fails('add-party', {code: 'TSTIMP', name: 'Dup', kind: 'customer', actor}, /unique|duplicate/i);
  await fails('book', {reference: 'T1', direction: 'import', mode: 'sea-fcl', customer: 'Hapag', actor}, /is a carrier, not a customer/);
  await fails('book', {reference: 'T1', direction: 'import', mode: 'sea-fcl', customer: 'TSTIMP', origin: 'Port of Genoa', actor}, /UN\/LOCODE/);
  await fails('book', {reference: 'T1', direction: 'import', mode: 'sea-fcl', customer: 'TSTIMP', etd: day(5), eta: day(1), actor}, /before --etd/);
  const t1 = await call('book', {reference: 't1', direction: 'import', mode: 'sea-fcl', customer: 'TSTIMP', carrier: 'HLCU', origin: 'ITGOA', destination: 'AUMEL', etd: day(-30), eta: day(1),
    'bmsb-goods': 'true', 'customs-value': '5,000', operator: 'Aisha', 'house-bill': 'SCFT1', actor});
  assert.equal(t1.reference, 'T1'); assert.equal(t1.origin_country, 'IT'); assert.equal(t1.eta_original, day(1)); assert.equal(Number(t1.customs_value), 5000);
  assert(await has('T1', 'AU-ICS-64AB', 1), 'cargo report 48 hours before an arrival tomorrow is already late');
  assert.equal(await has('T1', 'BMSB-SEASON'), inSeason(day(-30)));
  await fails('report-cargo', {shipment: 'T1', at: stamp(5), actor}, /future/);
  await call('report-cargo', {shipment: 'T1', at: stamp(0), actor}); assert(!(await has('T1', 'AU-ICS-64AB')));
  await call('update-shipment', {shipment: 'T1', 'bmsb-cert': 'HT-GOA-1182', actor}); assert(!(await has('T1', 'BMSB-SEASON')));
  await fails('add-container', {shipment: 'T1', number: 'TGHU8801128', actor}, /check digit/);
  await call('add-container', {shipment: 'T1', number: 'TGHU8801127', size: '20gp', 'free-days': '5', actor});
  await fails('add-container', {shipment: 'T1', number: 'TGHU8801127', actor}, /unique|duplicate/i);
  await fails('update-shipment', {shipment: 'T1', ata: day(2), actor}, /future/);
  await fails('update-shipment', {shipment: 'T1', ata: day(-31), actor}, /before departure|ETA cannot|Arrival cannot/);
  await call('update-shipment', {shipment: 'T1', atd: day(-30), actor});
  const arrived = await call('update-shipment', {shipment: 'T1', ata: day(0), eta: day(0), actor}); assert.equal(arrived.status, 'arrived'); assert.equal(arrived.eta_original, day(1));
  assert.equal(find(await call('free-time'), 'TGHU8801127', 'number').days_left, 5);
  assert.equal(find(await call('carrier-reliability'), 'Hapag-Lloyd', 'carrier').shipments, 5);
  assert(await has('T1', 'AU-DECL-68', 1));
  await fails('deliver', {shipment: 'T1', actor}, /import declaration/);
  const cleared = await call('record-entry', {shipment: 'T1', entry: 'AXT1', cleared: day(0), actor}); assert.equal(cleared.status, 'cleared'); assert(!(await has('T1', 'AU-DECL-68')));
  await fails('deliver', {shipment: 'T1', date: day(-2), actor}, /before arrival/);
  assert.equal((await call('deliver', {shipment: 'T1', actor})).status, 'delivered');
  await fails('deliver', {shipment: 'T1', actor}, /Already delivered/);
  await fails('close-job', {shipment: 'T1', actor}, /No revenue/);
  await fails('add-charge', {shipment: 'T1', side: 'revenue', code: 'XYZ', party: 'TSTIMP', amount: '10', currency: 'AUD', actor}, /Unknown charge code[\s\S]*FRT/);
  await fails('add-charge', {shipment: 'T1', side: 'revenue', code: 'FRT', party: 'HLCU', amount: '10', currency: 'AUD', actor}, /not a customer/);
  await call('add-charge', {shipment: 'T1', side: 'revenue', code: 'frt', party: 'TSTIMP', amount: '3,000', currency: 'aud', actor});
  await fails('add-charge', {shipment: 'T1', side: 'cost', code: 'FRT', party: 'HLCU', amount: '1000', currency: 'USD', actor}, /--fx is required/);
  await fails('add-charge', {shipment: 'T1', side: 'cost', code: 'FRT', party: 'HLCU', amount: '-5', currency: 'AUD', actor}, /positive number/);
  await call('add-charge', {shipment: 'T1', side: 'cost', code: 'FRT', party: 'HLCU', amount: '1000', currency: 'USD', fx: '1.5', actor});
  await call('add-charge', {shipment: 'T1', side: 'cost', code: 'DET', party: 'HLCU', amount: '200', currency: 'AUD', actor});
  assert(await has('T1', 'POLICY-UNRECOVERED')); await call('add-charge', {shipment: 'T1', side: 'revenue', code: 'DET', party: 'TSTIMP', amount: '200', currency: 'AUD', actor});
  assert(!(await has('T1', 'POLICY-UNRECOVERED')));
  const tp = find(await call('job-profit'), 'T1'); assert.equal(Number(tp.revenue), 3200); assert.equal(Number(tp.cost), 1700); assert.equal(Number(tp.margin_pct), 46.9);
  await fails('close-job', {shipment: 'T1', actor}, /not invoiced/);
  await call('invoice', {shipment: 'T1', ref: 'INV-T1', actor}); await fails('invoice', {shipment: 'T1', ref: 'INV-T2', actor}, /No open revenue/);
  await fails('close-job', {shipment: 'T1', actor}, /still accrued/);
  await fails('post-cost', {shipment: 'T1', party: 'MAEU', ref: 'X', actor}, /No open costs from Maersk/);
  await call('post-cost', {shipment: 'T1', party: 'HLCU', ref: 'HL-T1', code: 'frt', actor}); await call('post-cost', {shipment: 'T1', party: 'HLCU', ref: 'HL-T1-DET', actor});
  await fails('close-job', {shipment: 'T1', actor}, /not returned[\s\S]*TGHU8801127/);
  await fails('update-container', {container: 'TGHU8801127', 'empty-returned': day(-5), actor}, /before the vessel arrived/);
  await call('update-container', {container: 'TGHU8801127', 'empty-returned': day(0), actor});
  assert.equal((await call('close-job', {shipment: 'T1', actor})).status, 'closed');
  await fails('update-shipment', {shipment: 'T1', goods: 'x', actor}, /T1 is closed/);
  await call('settings', {'margin-floor': '60', actor}); assert(await has('T1', 'POLICY-MARGIN', 3)); await call('settings', {'margin-floor': '15', actor});

  // exports: dangerous goods, VGM, cutoffs and milestones
  const dg = await call('book', {reference: 'T2', direction: 'export', mode: 'air', customer: 'Murray', origin: 'AUMEL', destination: 'NZAKL', etd: day(1), eta: day(1), 'dangerous-goods': 'yes', 'doc-cutoff': stamp(-2), actor});
  assert.equal(dg.dangerous_goods, true); assert(await has('T2', 'DG-DECLARATION', 1));
  await fails('add-container', {shipment: 'T2', number: 'TCLU4511202', actor}, /no containers/);
  await call('update-shipment', {shipment: 'T2', 'dg-declaration': day(0), actor}); assert(!(await has('T2', 'DG-DECLARATION')));
  await fails('draft-arrival-notice', {shipment: 'T2'}, /for imports/); await fails('report-cargo', {shipment: 'T2', at: stamp(0), actor}, /for imports/);
  await call('book', {reference: 'T3', direction: 'export', mode: 'sea-fcl', customer: 'Barossa', origin: 'AUADL', destination: 'SGSIN', etd: day(5), eta: day(15), 'cargo-cutoff': stamp(30), actor});
  await call('add-container', {shipment: 'T3', number: 'TCLU4511202', size: '20GP', actor}); assert(await has('T3/TCLU4511202', 'SOLAS-VGM', 2));
  assert.equal(find(await call('cutoffs', {days: '2'}), 'T3').containers_without_vgm, 1);
  await fails('update-container', {container: 'TCLU4511202', vgm: 'heavy', actor}, /positive number/);
  await call('update-container', {container: 'TCLU4511202', vgm: '18250.5', actor}); assert(!(await has('T3/TCLU4511202', 'SOLAS-VGM')));
  await fails('milestone', {shipment: 'T3', code: 'docs-received', actor}, /--planned or --actual/);
  await fails('milestone', {shipment: 'T3', code: 'lunch', planned: day(-1), actor}, /--code must be/);
  await call('milestone', {shipment: 'T3', code: 'docs-received', planned: day(-2), actor}); assert(find(await call('exceptions'), 'T3', 'shipment'));
  await fails('milestone', {shipment: 'T3', code: 'docs-received', actual: day(1), actor}, /future/);
  await call('milestone', {shipment: 'T3', code: 'docs-received', actual: day(0), note: 'Invoice and packing list in', actor});
  assert(!find(await call('exceptions'), 'T3', 'shipment')); assert.equal((await call('shipment', {shipment: 'T3'})).milestones[0].note, 'Invoice and packing list in');
  await fails('close-job', {shipment: 'T3', actor}, /Deliver the job first/);
  await fails('cancel', {shipment: 'T3', actor}, /--reason is required/);
  assert.equal((await call('cancel', {shipment: 'T3', reason: 'Customer moved the order to next month', actor})).status, 'cancelled');
  assert(!find(await call('shipments'), 'T3')); await fails('cancel', {shipment: 'S1002', reason: 'x', actor}, /Invoices already raised[\s\S]*INV-20412/);

  // the seeded problems, fixed the way an operator fixes them
  await call('update-container', {container: 'MSKU7654333', 'empty-returned': day(0), actor}); assert(!(await has('S1002/MSKU7654333', 'POLICY-FREE-TIME')));
  await call('add-charge', {shipment: 'S1003', side: 'revenue', code: 'DEL', party: 'COAFIT', amount: '395', currency: 'AUD', actor});
  await call('invoice', {shipment: 'S1003', ref: 'INV-20460', actor}); assert(!(await has('S1003', 'POLICY-UNBILLED'))); assert(!(await has('S1003', 'POLICY-UNRECOVERED')));
  await call('update-shipment', {shipment: 'S1009', ata: day(0), actor}); assert(!(await has('S1009', 'POLICY-ETA')));
  assert.equal(find(await call('carrier-reliability'), 'Hapag-Lloyd', 'carrier').worst_slip_days, 5);
  await call('record-entry', {shipment: 'S1007', entry: 'NZE-55120', actor}); assert(!(await has('S1007', 'NZ-DECL-20')));
  await call('settings', {country: 'nz', currency: 'NZD', actor}); assert.equal((await call('settings'))[0].base_currency, 'NZD');
  await fails('add-charge', {shipment: 'S1001', side: 'revenue', code: 'HAN', party: 'MURAGR', amount: '50', currency: 'AUD', actor}, /--fx is required for AUD/);
  await call('settings', {country: 'AU', currency: 'AUD', actor});
  await call('log', {record: 's1001', note: 'Customer asked for the treatment certificate copy', actor});
  assert((await call('activity', {record: 'S1001'})).some(r => r.note === 'Customer asked for the treatment certificate copy'));
  await fails('log', {record: 'NOPE-1', note: 'x', actor}, /No record/);
  await fails('book', {reference: 'T4', direction: 'import', mode: 'air', customer: 'Murray'}, /--actor is required/);

  // drafts
  const st = await call('draft-status', {customer: 'murray agri'}); const text = fs.readFileSync(st.file, 'utf8');
  assert(text.includes('Nothing has been sent')); assert(text.includes('S1001')); assert(text.includes('Hi Dean')); assert(!text.includes('T1'), 'closed jobs stay out');
  await fails('draft-status', {customer: 'Hapag-Lloyd'}, /not a customer/);
  const an = await call('draft-arrival-notice', {shipment: 'S1001'}); const notice = fs.readFileSync(an.file, 'utf8');
  assert(notice.includes('HLXU8812342')); assert(notice.includes('SCF1001')); assert(notice.includes('Nothing has been sent'));

  // ---- import from a CargoWise shipment list report
  const imp = {file: path.join(REPO_ROOT, 'fixtures/cargowise.csv'), actor: 'Migration operator'};
  assert.equal((await call('import', {...imp, 'dry-run': true}, ['cargowise'])).added, 3);
  await assert.rejects(() => resolve(db, 'shipments', 'CW-S00048211'), /No matching/, 'dry run leaves nothing behind');
  assert.equal((await call('parties', {kind: 'customer'})).length, 6);
  const first = await call('import', imp, ['cargowise']); assert.equal(first.added, 3); assert.equal(first.customers_added, 1);
  assert.equal((await call('import', imp, ['cargowise'])).unchanged, 3);
  const cw = await resolve(db, 'shipments', 'CW-S00048211');
  assert.equal(cw.status, 'draft'); assert.equal(cw.mode, 'sea-fcl'); assert.equal(cw.eta, '2026-12-08'); assert.equal(Number(cw.weight_kg), 14200); assert.equal(cw.source_row['Shipment Status'], 'Booked'); assert.equal(cw.origin_country, 'DE');
  const air = await resolve(db, 'shipments', 'SCF48230'); assert.equal(air.mode, 'air'); assert.equal(air.etd, '2026-11-14');
  assert.equal((await resolve(db, 'shipments', 'CW-S00048244')).direction, 'export');
  assert(await has('CW-S00048211', 'POLICY-IMPORT', 3)); assert(!find(await call('shipments'), 'CW-S00048211'), 'drafts stay off the board');
  await fails('update-shipment', {shipment: 'CW-S00048211', status: 'in-transit', actor}, /Book an imported draft first/);
  await call('update-shipment', {shipment: 'CW-S00048211', status: 'booked', operator: 'Aisha', actor}); assert(find(await call('shipments'), 'CW-S00048211'));
  const changed = path.join(dir, 'changed.csv'); fs.writeFileSync(changed, fs.readFileSync(imp.file, 'utf8').replace('E-bike frames', 'E-bike wheels'));
  await fails('import', {...imp, file: changed}, /changed since the last import/, ['cargowise']);
  const atomic = path.join(dir, 'atomic.csv'); fs.writeFileSync(atomic, 'Shipment ID,Local Client,Direction,Transport Mode,Container Mode\nN1,New Co,IMP,SEA,FCL\nN2,New Co,SIDEWAYS,SEA,FCL\n');
  await fails('import', {...imp, file: atomic}, /Row 3: direction/, ['cargowise']); await assert.rejects(() => resolve(db, 'shipments', 'CW-N1'), /No matching/);
  const mapped = path.join(dir, 'mapped.csv'), map = path.join(dir, 'map.json');
  fs.writeFileSync(mapped, 'Job,Customer,Dir,Mode,Load,From,To\nM1,Northside Homewares,Import,Sea,LCL,CNNGB,AUMEL\n');
  fs.writeFileSync(map, JSON.stringify({source_id: 'Job', customer: 'Customer', direction: 'Dir', transport: 'Mode', container_mode: 'Load', origin: 'From', destination: 'To'}));
  const m1 = await call('import', {...imp, file: mapped, map}, ['cargowise']); assert.equal(m1.added, 1); assert.equal(m1.customers_added, 0);
  assert.equal((await resolve(db, 'shipments', 'CW-M1')).mode, 'sea-lcl');
  fs.writeFileSync(map, JSON.stringify({source_id: 'Missing'})); await fails('import', {...imp, file: mapped, map}, /Mapped column missing/, ['cargowise']);
  await fails('import', imp, /Supported import: cargowise/, ['magaya']);

  const exp = await call('export'); const backup = JSON.parse(fs.readFileSync(exp.file, 'utf8'));
  assert.equal(backup.records.shipments.length, 18); assert.equal(Object.keys(backup.records).length, 9); assert(backup.records.activity.length > 40);
  assert(human(await call('shipments')).includes('S1001'));
  assert.equal(Object.keys(commands).filter(c => !visited.has(c)).length, 0, `Uncovered commands: ${Object.keys(commands).filter(c => !visited.has(c))}`);
  await db.close(); db = null;

  // ---- the CLI as a person runs it, and the rendered pages
  assert.equal(JSON.parse(shell('forwarding.mjs', ['shipments', '--json'])).length, 10);
  const amb = spawnSync(process.execPath, [path.join(REPO_ROOT, 'scripts/forwarding.mjs'), 'shipment', '--shipment=S100', '--json'], {cwd: REPO_ROOT, env: process.env, encoding: 'utf8'});
  assert.equal(amb.status, 1); assert.match(amb.stderr, /S1001[\s\S]*S1002/); assert.equal(amb.stdout, '');
  shell('view.mjs'); shell('docs.mjs');
  const week = fs.readFileSync(path.join(dir, 'views', 'week.html'), 'utf8'); assert(week.includes('Forwarding week')); assert(week.includes('SOLAS') || week.includes('AU-ICS-64AB'));
  assert.equal(fs.readdirSync(path.join(dir, 'views')).length, 3);
  assert(fs.readdirSync(path.join(dir, 'docs-out', 'arrival-notice')).length >= 4);
  const sheets = fs.readdirSync(path.join(dir, 'docs-out', 'job-sheet')); assert(sheets.some(f => f.startsWith('t1-')));
  const statements = fs.readdirSync(path.join(dir, 'docs-out', 'customer-statement'));
  const t1sheet = fs.readFileSync(path.join(dir, 'docs-out', 'job-sheet', sheets.find(f => f.startsWith('t1-'))), 'utf8');
  assert(t1sheet.includes('Test Importer &lt;script&gt;')); assert(!t1sheet.includes('<script>alert'));
  assert(!statements.some(f => f.startsWith('test-importer')), 'a customer with only closed jobs gets no statement');
  console.log(`PASS: ${Object.keys(commands).length} CLI commands; cargo report, import declaration, BMSB, VGM, dangerous goods and house rules; job profit and closing checks; import rollback, repeats and mapping; drafts, exports and rendered pages (${process.env.TEST_DATABASE_URL ? 'Postgres' : 'PGlite'}, ${process.platform}).`);
} finally { if (db) await db.close(); fs.rmSync(dir, {recursive: true, force: true}); }
