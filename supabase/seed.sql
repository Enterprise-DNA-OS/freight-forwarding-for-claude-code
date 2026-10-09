-- Demo data: Southern Cross Forwarding, a fictional Melbourne freight forwarder.
-- Dates are relative to today so the cargo report clock, the free time, the cutoffs and the
-- unbilled jobs always have something to say. Safe to run twice: every insert skips rows already there.

insert into organisation (id, name, country, base_currency, default_free_days, margin_floor_pct, invoice_within_days)
values (true, 'Southern Cross Forwarding', 'AU', 'AUD', 7, 15, 3)
on conflict do nothing;

insert into parties (id, code, name, kind, email, contact) values
('c0000000-0000-0000-0000-000000000001', 'MURAGR', 'Murray Agri Parts', 'customer', 'imports@murrayagri.example', 'Dean Kowalski'),
('c0000000-0000-0000-0000-000000000002', 'NTHHOM', 'Northside Homewares', 'customer', 'buying@northside.example', 'Mei Lin'),
('c0000000-0000-0000-0000-000000000003', 'COAFIT', 'Coastline Fitness Equipment', 'customer', 'ops@coastlinefit.example', 'Josh Tane'),
('c0000000-0000-0000-0000-000000000004', 'YARBRW', 'Yarra Valley Brewing Supplies', 'customer', 'orders@yarrabrew.example', 'Priya Nair'),
('c0000000-0000-0000-0000-000000000005', 'BARCEL', 'Barossa Cellar Exports', 'customer', 'export@barossacellar.example', 'Tom Schulz'),
('c0000000-0000-0000-0000-000000000011', 'HLCU', 'Hapag-Lloyd', 'carrier', '', ''),
('c0000000-0000-0000-0000-000000000012', 'MAEU', 'Maersk', 'carrier', '', ''),
('c0000000-0000-0000-0000-000000000013', 'QFCARGO', 'Qantas Freight', 'carrier', '', ''),
('c0000000-0000-0000-0000-000000000014', 'ANLC', 'ANL', 'carrier', '', ''),
('c0000000-0000-0000-0000-000000000021', 'ELBEHAM', 'Elbe Logistik GmbH', 'agent', 'ops@elbelogistik.example', ''),
('c0000000-0000-0000-0000-000000000022', 'PUDSHA', 'Pudong Cargo Services', 'agent', 'ops@pudongcargo.example', ''),
('c0000000-0000-0000-0000-000000000031', 'WESTRK', 'Westgate Transport', 'trucker', 'dispatch@westgate.example', ''),
('c0000000-0000-0000-0000-000000000032', 'PORTMEL', 'Port Melbourne Terminals', 'supplier', '', '')
on conflict do nothing;

-- 2025-26 target risk countries from the department's industry presentation. Check the current season's list.
insert into bmsb_countries (code, name, season) values
('AL','Albania','2025-26'),('AD','Andorra','2025-26'),('AM','Armenia','2025-26'),('AT','Austria','2025-26'),('AZ','Azerbaijan','2025-26'),
('BE','Belgium','2025-26'),('BA','Bosnia and Herzegovina','2025-26'),('BG','Bulgaria','2025-26'),('CA','Canada','2025-26'),('HR','Croatia','2025-26'),
('CZ','Czechia','2025-26'),('FR','France','2025-26'),('GE','Georgia','2025-26'),('DE','Germany','2025-26'),('GR','Greece','2025-26'),
('HU','Hungary','2025-26'),('IT','Italy','2025-26'),('KZ','Kazakhstan','2025-26'),('XK','Kosovo','2025-26'),('LI','Liechtenstein','2025-26'),
('LU','Luxembourg','2025-26'),('ME','Montenegro','2025-26'),('MD','Moldova','2025-26'),('NL','Netherlands','2025-26'),('PL','Poland','2025-26'),
('PT','Portugal','2025-26'),('MK','North Macedonia','2025-26'),('RO','Romania','2025-26'),('RU','Russia','2025-26'),('RS','Serbia','2025-26'),
('SK','Slovakia','2025-26'),('SI','Slovenia','2025-26'),('ES','Spain','2025-26'),('CH','Switzerland','2025-26'),('TR','Turkiye','2025-26'),
('UA','Ukraine','2025-26'),('US','United States of America','2025-26'),('UZ','Uzbekistan','2025-26')
on conflict do nothing;

insert into charge_codes (code, description, recoverable) values
('FRT', 'Ocean or air freight', true), ('THC', 'Terminal handling', true), ('DOC', 'Documentation', true),
('CUS', 'Customs clearance', true), ('DEL', 'Delivery cartage', true), ('DET', 'Container detention', true),
('FUM', 'BMSB treatment or fumigation', true), ('AGT', 'Overseas agent handling', false), ('HAN', 'Handling and service fee', true)
on conflict do nothing;

insert into shipments (id, reference, status, direction, mode, customer_id, carrier_id, agent_id, operator, incoterm,
  origin_port, origin_country, destination_port, destination_country, house_bill, master_bill, voyage,
  etd, eta, eta_original, atd, ata, doc_cutoff_at, cargo_cutoff_at, goods, packages, weight_kg, volume_m3, customs_value,
  cargo_reported_at, entry_number, cleared_on, delivered_on, dangerous_goods, dg_declaration_on, bmsb_target_goods, bmsb_treatment_cert, closed_on) values
('a0000000-0000-0000-0000-000000001001', 'S1001', 'in-transit', 'import', 'sea-fcl', 'c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000021', 'Aisha', 'FOB',
  'DEHAM', 'DE', 'AUMEL', 'AU', 'SCF1001', 'HLCUHAM2609881', 'Kuala Lumpur Express 2609E',
  current_date - 20, current_date + 2, current_date, current_date - 20, null, null, null, 'Tractor linkage arms and three-point hitch parts', 42, 18400, 58, 48500,
  null, '', null, null, false, null, true, '', null),
('a0000000-0000-0000-0000-000000001002', 'S1002', 'cleared', 'import', 'sea-fcl', 'c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000022', 'Ben', 'FOB',
  'CNSHA', 'CN', 'AUMEL', 'AU', 'SCF1002', 'MAEU263311902', 'Maersk Seoul 239S',
  current_date - 25, current_date - 5, current_date - 6, current_date - 25, current_date - 5, null, null, 'Ceramic dinnerware and glassware', 610, 21300, 96, 72400,
  now() - interval '8 days', 'AXJ7K2LQ9', current_date - 3, null, false, null, false, '', null),
('a0000000-0000-0000-0000-000000001003', 'S1003', 'delivered', 'import', 'sea-lcl', 'c0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000014', 'c0000000-0000-0000-0000-000000000022', 'Ben', 'FOB',
  'CNNGB', 'CN', 'AUSYD', 'AU', 'SCF1003', 'ANLU8812034', 'ANL Wangaratta 118S',
  current_date - 40, current_date - 16, current_date - 18, current_date - 40, current_date - 16, null, null, 'Rowing machines and spin bikes', 64, 3900, 14.2, 28600,
  now() - interval '19 days', 'BQP4M8RT1', current_date - 12, current_date - 9, false, null, false, '', null),
('a0000000-0000-0000-0000-000000001004', 'S1004', 'booked', 'import', 'air', 'c0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000013', null, 'Aisha', 'FCA',
  'USLAX', 'US', 'AUMEL', 'AU', 'SCF1004', '081-55120934', 'QF94',
  current_date + 1, current_date + 2, current_date + 2, null, null, null, null, 'Stainless transfer pump spares', 3, 86, 0.4, 800,
  null, '', null, null, false, null, false, '', null),
('a0000000-0000-0000-0000-000000001005', 'S1005', 'booked', 'export', 'sea-fcl', 'c0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000022', 'Ben', 'CIF',
  'AUADL', 'AU', 'CNSHA', 'CN', 'SCF1005', '', 'Maersk Kowloon 241N',
  current_date + 4, current_date + 18, current_date + 18, null, null, now() + interval '1 day', now() + interval '2 days', 'Bottled red wine, 1,560 cases', 1560, 21800, 52, null,
  null, '', null, null, false, null, false, '', null),
('a0000000-0000-0000-0000-000000001006', 'S1006', 'booked', 'export', 'air', 'c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000013', null, 'Aisha', 'DAP',
  'AUMEL', 'AU', 'NZAKL', 'NZ', 'SCF1006', '081-55120988', 'QF153',
  current_date + 1, current_date + 1, current_date + 1, null, null, now() - interval '1 day', now() + interval '12 hours', 'Lithium ion batteries packed with equipment (UN3481)', 6, 240, 1.1, null,
  null, '', null, null, true, null, false, '', null),
('a0000000-0000-0000-0000-000000001007', 'S1007', 'arrived', 'import', 'sea-fcl', 'c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000011', null, 'Ben', 'FOB',
  'ESVLC', 'ES', 'NZAKL', 'NZ', 'SCF1007', 'HLCUVLC2608410', 'Cap San Lorenzo 2608E',
  current_date - 60, current_date - 22, current_date - 24, current_date - 60, current_date - 22, null, null, 'Outdoor furniture, steel and timber', 220, 9600, 61, 30400,
  null, '', null, null, false, null, true, 'FUM-ESVLC-77812', null),
('a0000000-0000-0000-0000-000000001008', 'S1008', 'closed', 'import', 'sea-lcl', 'c0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000014', 'c0000000-0000-0000-0000-000000000022', 'Ben', 'FOB',
  'CNNGB', 'CN', 'AUMEL', 'AU', 'SCF1008', 'ANLU8790012', 'ANL Dandenong 116S',
  current_date - 70, current_date - 46, current_date - 47, current_date - 70, current_date - 44, null, null, 'Dumbbell sets', 30, 2600, 6, 9800,
  now() - interval '48 days', 'CRL9X3NV5', current_date - 41, current_date - 38, false, null, false, '', current_date - 20),
('a0000000-0000-0000-0000-000000001009', 'S1009', 'in-transit', 'import', 'sea-fcl', 'c0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000011', null, 'Aisha', 'FOB',
  'KRPUS', 'KR', 'AUBNE', 'AU', 'SCF1009', 'HLCUPUS2609130', 'Seaspan Brisbane 2609S',
  current_date - 15, current_date - 1, current_date - 4, current_date - 15, null, null, null, 'Fermentation tanks', 4, 7800, 66, 61000,
  now() - interval '4 days', 'DMT2H6WE8', null, null, false, null, false, '', null),
('a0000000-0000-0000-0000-000000000990', 'S0990', 'closed', 'import', 'sea-fcl', 'c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000021', 'Aisha', 'FOB',
  'DEHAM', 'DE', 'AUMEL', 'AU', 'SCF0990', 'HLCUHAM2606120', 'Kuala Lumpur Express 2606E',
  current_date - 95, current_date - 55, current_date - 60, current_date - 95, current_date - 55, null, null, 'Seed drill parts', 18, 9100, 40, 39000,
  now() - interval '62 days', 'ENQ5R7YB3', current_date - 52, current_date - 50, false, null, false, '', current_date - 35),
('a0000000-0000-0000-0000-000000000991', 'S0991', 'closed', 'import', 'sea-fcl', 'c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000022', 'Ben', 'FOB',
  'CNSHA', 'CN', 'AUMEL', 'AU', 'SCF0991', 'MAEU262207741', 'Maersk Seoul 231S',
  current_date - 70, current_date - 50, current_date - 50, current_date - 70, current_date - 49, null, null, 'Cookware', 480, 17600, 70, 51000,
  now() - interval '55 days', 'FTW8L1KC6', current_date - 47, current_date - 45, false, null, false, '', current_date - 30)
on conflict do nothing;

insert into containers (id, shipment_id, number, size, seal, vgm_kg, vgm_at, free_days, gate_out_on, empty_returned_on) values
('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000001001', 'HLXU8812342', '40HC', 'HL4471120', 22150, now() - interval '24 days', 10, null, null),
('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000001002', 'MSKU7654328', '40HC', 'ML0098812', 14200, now() - interval '27 days', 7, current_date - 3, null),
('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000001002', 'MSKU7654333', '20GP', 'ML0098813', 11800, now() - interval '27 days', 4, current_date - 3, null),
('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000001005', 'MSKU2210980', '20GP', '', 12400, now() - interval '1 day', null, null, null),
('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000001005', 'MSKU2210995', '20GP', '', null, null, null, null, null),
('d0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000001007', 'HLXU5531207', '40HC', 'HL3310877', 11900, now() - interval '62 days', 7, current_date - 18, current_date - 15),
('d0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000001009', 'HLXU6630210', '40HC', 'HL5520911', 9900, now() - interval '17 days', 10, null, null),
('d0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000990', 'HLXU4419039', '40HC', 'HL2209817', 13100, now() - interval '97 days', 10, current_date - 53, current_date - 50),
('d0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000991', 'MSKU5512875', '40HC', 'ML0071164', 19900, now() - interval '72 days', 7, current_date - 47, current_date - 44)
on conflict do nothing;

insert into milestones (id, shipment_id, code, planned_on, actual_on, note) values
('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000001001', 'departed', current_date - 20, current_date - 20, ''),
('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000001001', 'arrived', current_date + 2, null, ''),
('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000001002', 'customs-cleared', current_date - 4, current_date - 3, ''),
('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000001002', 'delivered', current_date - 1, null, 'Customer asked to hold until the warehouse has space'),
('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000001005', 'docs-received', current_date - 1, null, 'Waiting on the commercial invoice and packing list'),
('e0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000001005', 'gate-in', current_date + 2, null, ''),
('e0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000001003', 'pod-received', current_date - 6, null, ''),
('e0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000001009', 'arrived', current_date - 1, null, 'Vessel held at anchor')
on conflict do nothing;

insert into charges (id, shipment_id, side, code, description, party_id, amount, currency, fx_rate, status, invoice_ref, invoiced_on) values
-- S1001: in transit, costs accruing, revenue not yet invoiced
('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000001001', 'cost', 'FRT', 'Ocean freight HAM-MEL', 'c0000000-0000-0000-0000-000000000011', 2150, 'USD', 1.52, 'open', '', null),
('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000001001', 'cost', 'AGT', 'Origin handling', 'c0000000-0000-0000-0000-000000000021', 180, 'EUR', 1.68, 'open', '', null),
('f0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000001001', 'revenue', 'FRT', 'Ocean freight', 'c0000000-0000-0000-0000-000000000001', 4100, 'AUD', 1, 'open', '', null),
('f0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000001001', 'revenue', 'CUS', 'Customs clearance', 'c0000000-0000-0000-0000-000000000001', 285, 'AUD', 1, 'open', '', null),
-- S1002: cleared, detention about to start
('f0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000001002', 'cost', 'FRT', 'Ocean freight SHA-MEL', 'c0000000-0000-0000-0000-000000000012', 1450, 'USD', 1.52, 'open', '', null),
('f0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000001002', 'cost', 'THC', 'Destination terminal handling', 'c0000000-0000-0000-0000-000000000032', 690, 'AUD', 1, 'posted', 'PMT-55102', current_date - 4),
('f0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000001002', 'revenue', 'FRT', 'Ocean freight', 'c0000000-0000-0000-0000-000000000002', 2900, 'AUD', 1, 'open', '', null),
('f0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000001002', 'revenue', 'THC', 'Terminal handling', 'c0000000-0000-0000-0000-000000000002', 760, 'AUD', 1, 'open', '', null),
('f0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000001002', 'revenue', 'CUS', 'Customs clearance', 'c0000000-0000-0000-0000-000000000002', 285, 'AUD', 1, 'invoiced', 'INV-20412', current_date - 3),
-- S1003: delivered nine days ago, freight and customs not invoiced, cartage never charged
('f0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000001003', 'cost', 'FRT', 'LCL freight NGB-SYD', 'c0000000-0000-0000-0000-000000000014', 610, 'USD', 1.52, 'posted', 'ANL-883012', current_date - 14),
('f0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000001003', 'cost', 'CUS', 'Broker fee', 'c0000000-0000-0000-0000-000000000032', 120, 'AUD', 1, 'posted', 'PMT-55011', current_date - 12),
('f0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000001003', 'cost', 'DEL', 'Cartage to Penrith', 'c0000000-0000-0000-0000-000000000031', 340, 'AUD', 1, 'open', '', null),
('f0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000001003', 'revenue', 'FRT', 'LCL freight', 'c0000000-0000-0000-0000-000000000003', 1650, 'AUD', 1, 'open', '', null),
('f0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000001003', 'revenue', 'CUS', 'Customs clearance', 'c0000000-0000-0000-0000-000000000003', 285, 'AUD', 1, 'open', '', null),
-- S1007: arrived in Auckland, the origin BMSB treatment never charged on
('f0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000001007', 'cost', 'FRT', 'Ocean freight VLC-AKL', 'c0000000-0000-0000-0000-000000000011', 2600, 'USD', 1.52, 'open', '', null),
('f0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000001007', 'cost', 'FUM', 'BMSB heat treatment at origin', 'c0000000-0000-0000-0000-000000000011', 310, 'EUR', 1.68, 'posted', 'HL-VLC-1182', current_date - 58),
('f0000000-0000-0000-0000-000000000026', 'a0000000-0000-0000-0000-000000001007', 'revenue', 'FRT', 'Ocean freight', 'c0000000-0000-0000-0000-000000000002', 6100, 'AUD', 1, 'open', '', null),
-- S1008: closed under the margin floor
('f0000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000001008', 'cost', 'FRT', 'LCL freight NGB-MEL', 'c0000000-0000-0000-0000-000000000014', 1820, 'AUD', 1, 'posted', 'ANL-870044', current_date - 40),
('f0000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000001008', 'revenue', 'FRT', 'LCL freight, all in', 'c0000000-0000-0000-0000-000000000003', 2000, 'AUD', 1, 'invoiced', 'INV-20201', current_date - 37),
-- S1009: in transit, revenue quoted
('f0000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000001009', 'cost', 'FRT', 'Ocean freight PUS-BNE', 'c0000000-0000-0000-0000-000000000011', 1300, 'USD', 1.52, 'open', '', null),
('f0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000001009', 'revenue', 'FRT', 'Ocean freight', 'c0000000-0000-0000-0000-000000000004', 2650, 'AUD', 1, 'open', '', null),
-- S0990 and S0991: closed, healthy, invoiced
('f0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000990', 'cost', 'FRT', 'Ocean freight HAM-MEL', 'c0000000-0000-0000-0000-000000000011', 2050, 'USD', 1.52, 'posted', 'HL-INV-77120', current_date - 50),
('f0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000990', 'revenue', 'FRT', 'Ocean freight', 'c0000000-0000-0000-0000-000000000001', 3950, 'AUD', 1, 'invoiced', 'INV-20188', current_date - 49),
('f0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000990', 'cost', 'DET', 'Detention, 3 days', 'c0000000-0000-0000-0000-000000000011', 450, 'AUD', 1, 'posted', 'HL-DET-0912', current_date - 45),
('f0000000-0000-0000-0000-000000000024', 'a0000000-0000-0000-0000-000000000991', 'cost', 'FRT', 'Ocean freight SHA-MEL', 'c0000000-0000-0000-0000-000000000012', 1400, 'USD', 1.52, 'posted', 'MAEU-INV-55821', current_date - 46),
('f0000000-0000-0000-0000-000000000025', 'a0000000-0000-0000-0000-000000000991', 'revenue', 'FRT', 'Ocean freight', 'c0000000-0000-0000-0000-000000000002', 2850, 'AUD', 1, 'invoiced', 'INV-20190', current_date - 44)
on conflict do nothing;

insert into activity (record_kind, record_ref, actor, action, note, created_at)
select 'shipment', 'S1002', 'Ben', 'note', 'Customer asked to hold delivery until Monday: warehouse full', now() - interval '1 day'
where not exists (select 1 from activity where record_ref = 'S1002' and action = 'note');
