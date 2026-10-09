-- Freight Forwarding for Claude Code: parties, house shipments, containers, milestones,
-- charges and job profit, with the border and carriage rules a forwarder answers for.
-- Plain Postgres. Runs the same on PGlite. No extensions.

create function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- One row: who this is. /customise changes it.
create table organisation (
  id boolean primary key default true check (id),
  name text not null default 'Your Business',
  country text not null default 'AU' check (country in ('AU','NZ')),
  base_currency text not null default 'AUD' check (base_currency ~ '^[A-Z]{3}$'),
  default_free_days int not null default 7 check (default_free_days between 0 and 60),
  margin_floor_pct numeric(5,2) not null default 15 check (margin_floor_pct between 0 and 100),
  invoice_within_days int not null default 3 check (invoice_within_days between 0 and 60),
  updated_at timestamptz not null default now()
);

-- Customers, carriers, overseas agents, truckers and other suppliers.
create table parties (
  id uuid primary key default gen_random_uuid(),
  code text not null check (btrim(code) <> ''),
  name text not null check (btrim(name) <> ''),
  kind text not null check (kind in ('customer','carrier','agent','trucker','supplier')),
  email text not null default '',
  contact text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index parties_code_ci_idx on parties(lower(code));

-- BMSB target risk countries (ISO 3166 alpha-2). The department publishes the list each season.
create table bmsb_countries (
  code text primary key check (code ~ '^[A-Z]{2}$'),
  name text not null,
  season text not null
);

-- Cost codes a customer should be charged for whenever we pay them.
create table charge_codes (
  code text primary key check (code ~ '^[A-Z0-9]{2,8}$'),
  description text not null,
  recoverable boolean not null default true
);

-- One row per house shipment (the job). The master bill groups house shipments on one carrier booking.
create table shipments (
  id uuid primary key default gen_random_uuid(),
  reference text not null check (btrim(reference) <> ''),
  status text not null default 'booked' check (status in ('draft','booked','in-transit','arrived','cleared','delivered','closed','cancelled')),
  direction text not null check (direction in ('import','export','crosstrade')),
  mode text not null check (mode in ('sea-fcl','sea-lcl','air')),
  customer_id uuid not null references parties(id),
  carrier_id uuid references parties(id),
  agent_id uuid references parties(id),
  operator text not null default '',
  incoterm text not null default '' check (incoterm in ('','EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP')),
  origin_port text not null default '',
  origin_country text not null default '' check (origin_country = '' or origin_country ~ '^[A-Z]{2}$'),
  destination_port text not null default '',
  destination_country text not null default '' check (destination_country = '' or destination_country ~ '^[A-Z]{2}$'),
  house_bill text not null default '',
  master_bill text not null default '',
  voyage text not null default '',
  etd date,
  eta date,
  eta_original date,
  atd date,
  ata date,
  doc_cutoff_at timestamptz,
  cargo_cutoff_at timestamptz,
  goods text not null default '',
  packages int check (packages >= 0),
  weight_kg numeric(12,2) check (weight_kg >= 0),
  volume_m3 numeric(10,3) check (volume_m3 >= 0),
  -- Customs value in the destination country's currency (AUD into Australia, NZD into New Zealand).
  customs_value numeric(14,2) check (customs_value >= 0),
  -- We lodge the house-level cargo report for this shipment (AU Customs Act 1901 s64AB).
  we_report_cargo boolean not null default true,
  cargo_reported_at timestamptz,
  entry_number text not null default '',
  cleared_on date,
  delivered_on date,
  dangerous_goods boolean not null default false,
  dg_declaration_on date,
  bmsb_target_goods boolean not null default false,
  bmsb_treatment_cert text not null default '',
  closed_on date,
  source_id text unique,
  source_row jsonb,
  source_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ata is null or atd is null or ata >= atd),
  check (eta is null or etd is null or eta >= etd)
);
create unique index shipments_reference_ci_idx on shipments(lower(reference));
create index shipments_eta_idx on shipments(eta) where status not in ('closed','cancelled');

create table containers (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references shipments(id),
  number text not null check (number ~ '^[A-Z]{4}[0-9]{7}$'),
  size text not null default '40HC' check (size in ('20GP','40GP','40HC','20RF','40RF','20OT','40OT','20FR','40FR','45HC')),
  seal text not null default '',
  -- SOLAS VI/2: verified gross mass, in kilograms, before loading.
  vgm_kg numeric(10,1) check (vgm_kg > 0),
  vgm_at timestamptz,
  free_days int check (free_days between 0 and 60),
  gate_out_on date,
  empty_returned_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shipment_id, number)
);

-- The plan and what happened. A planned date with no actual date is an exception once it passes.
create table milestones (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references shipments(id),
  code text not null check (code in ('booking-confirmed','docs-received','cargo-ready','gate-in','departed','arrived','customs-cleared','delivered','pod-received')),
  planned_on date,
  actual_on date,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shipment_id, code)
);

-- Costs we pay and revenue we charge, per job. Amounts in the charge currency; fx_rate converts to base.
create table charges (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references shipments(id),
  side text not null check (side in ('cost','revenue')),
  code text not null references charge_codes(code),
  description text not null default '',
  party_id uuid not null references parties(id),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  fx_rate numeric(12,6) not null default 1 check (fx_rate > 0),
  -- cost: accrued until the supplier invoice is posted. revenue: unbilled until invoiced.
  status text not null default 'open' check (status in ('open','posted','invoiced')),
  invoice_ref text not null default '',
  invoiced_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((side = 'cost' and status in ('open','posted')) or (side = 'revenue' and status in ('open','invoiced'))),
  check (status = 'open' or (btrim(invoice_ref) <> '' and invoiced_on is not null))
);
create index charges_shipment_idx on charges(shipment_id);

create table activity (
  id bigint generated always as identity primary key,
  record_kind text not null,
  record_ref text not null,
  actor text not null check (btrim(actor) <> ''),
  action text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create trigger shipments_touch before update on shipments for each row execute function touch_updated_at();
create trigger parties_touch before update on parties for each row execute function touch_updated_at();
create trigger containers_touch before update on containers for each row execute function touch_updated_at();
create trigger milestones_touch before update on milestones for each row execute function touch_updated_at();
create trigger charges_touch before update on charges for each row execute function touch_updated_at();
create trigger organisation_touch before update on organisation for each row execute function touch_updated_at();

-- ------------------------------------------------------------------ views

create view job_profit with (security_invoker=true) as
select s.id, s.reference, s.status, s.direction, s.mode, c.name as customer, s.operator,
  coalesce(sum(round(x.amount * x.fx_rate, 2)) filter (where x.side = 'revenue'), 0) as revenue,
  coalesce(sum(round(x.amount * x.fx_rate, 2)) filter (where x.side = 'cost'), 0) as cost,
  coalesce(sum(round(x.amount * x.fx_rate, 2)) filter (where x.side = 'revenue'), 0) - coalesce(sum(round(x.amount * x.fx_rate, 2)) filter (where x.side = 'cost'), 0) as profit,
  case when coalesce(sum(x.amount * x.fx_rate) filter (where x.side = 'revenue'), 0) > 0
    then round(100 * (sum(x.amount * x.fx_rate) filter (where x.side = 'revenue') - coalesce(sum(x.amount * x.fx_rate) filter (where x.side = 'cost'), 0)) / sum(x.amount * x.fx_rate) filter (where x.side = 'revenue'), 1) end as margin_pct,
  coalesce(sum(round(x.amount * x.fx_rate, 2)) filter (where x.side = 'revenue' and x.status = 'open'), 0) as unbilled,
  coalesce(sum(round(x.amount * x.fx_rate, 2)) filter (where x.side = 'cost' and x.status = 'open'), 0) as accrued,
  s.delivered_on, s.closed_on
from shipments s join parties c on c.id = s.customer_id left join charges x on x.shipment_id = s.id
where s.status <> 'cancelled'
group by s.id, s.reference, s.status, s.direction, s.mode, c.name, s.operator, s.delivered_on, s.closed_on;

create view shipment_board with (security_invoker=true) as
select s.id, s.reference, s.status, s.direction, s.mode, c.name as customer, s.operator,
  s.origin_port || ' > ' || s.destination_port as route, k.name as carrier, s.voyage, s.etd, s.eta,
  s.eta - current_date as days_to_eta,
  (select count(*) from containers t where t.shipment_id = s.id)::int as containers,
  (select coalesce(sum(case when t.size like '20%' then 1 else 2 end), 0) from containers t where t.shipment_id = s.id)::int as teu,
  p.profit, p.margin_pct
from shipments s join parties c on c.id = s.customer_id left join parties k on k.id = s.carrier_id
left join job_profit p on p.id = s.id
where s.status not in ('draft','closed','cancelled');

-- Import containers against their free time: from vessel arrival to the empty back at the depot.
create view container_free_time with (security_invoker=true) as
select t.id, s.reference as shipment, t.number, t.size, c.name as customer, s.ata,
  coalesce(t.free_days, g.default_free_days) as free_days,
  s.ata + coalesce(t.free_days, g.default_free_days) as free_until,
  s.ata + coalesce(t.free_days, g.default_free_days) - current_date as days_left,
  t.gate_out_on, t.empty_returned_on
from containers t join shipments s on s.id = t.shipment_id join parties c on c.id = s.customer_id
cross join organisation g
where s.direction = 'import' and s.ata is not null and t.empty_returned_on is null and s.status not in ('closed','cancelled');

-- Export bookings ahead of their cutoffs, with what is still missing.
create view cutoff_queue with (security_invoker=true) as
select s.id, s.reference, c.name as customer, s.mode, s.voyage, s.doc_cutoff_at, s.cargo_cutoff_at, s.etd,
  (select count(*) from containers t where t.shipment_id = s.id and t.vgm_kg is null)::int as containers_without_vgm,
  s.dangerous_goods and s.dg_declaration_on is null as dg_declaration_missing,
  (select m.actual_on from milestones m where m.shipment_id = s.id and m.code = 'docs-received') as docs_received_on
from shipments s join parties c on c.id = s.customer_id
where s.direction = 'export' and s.atd is null and s.status not in ('draft','closed','cancelled');

create view arrival_queue with (security_invoker=true) as
select s.id, s.reference, c.name as customer, s.mode, s.voyage, s.destination_port, s.eta, s.ata,
  coalesce(s.ata, s.eta) - current_date as days_to_arrival, s.house_bill, s.cargo_reported_at, s.entry_number, s.cleared_on,
  (select count(*) from containers t where t.shipment_id = s.id)::int as containers
from shipments s join parties c on c.id = s.customer_id
where s.direction = 'import' and s.delivered_on is null and s.status not in ('draft','closed','cancelled');

create view milestone_exceptions with (security_invoker=true) as
select m.id, s.reference as shipment, c.name as customer, s.operator, m.code as milestone, m.planned_on,
  current_date - m.planned_on as days_late
from milestones m join shipments s on s.id = m.shipment_id join parties c on c.id = s.customer_id
where m.actual_on is null and m.planned_on < current_date and s.status not in ('closed','cancelled');

-- Costs on a job with a recoverable code and no revenue line under the same code.
create view unrecovered_costs with (security_invoker=true) as
select x.id, s.reference as shipment, s.status, s.closed_on, c.name as customer, x.code, k.description, p.name as supplier,
  round(x.amount * x.fx_rate, 2) as cost
from charges x join shipments s on s.id = x.shipment_id join parties c on c.id = s.customer_id
join parties p on p.id = x.party_id join charge_codes k on k.code = x.code
where x.side = 'cost' and k.recoverable and s.status <> 'cancelled'
  and not exists (select 1 from charges r where r.shipment_id = x.shipment_id and r.side = 'revenue' and r.code = x.code);

-- Business days after a date, Monday to Friday. Public holidays are not known to the database.
create function add_business_days(start_on date, n int) returns date language sql immutable as $$
  select d::date from generate_series(start_on + 1, start_on + n * 2 + 14, interval '1 day') d
  where extract(isodow from d) < 6 order by d offset n - 1 limit 1
$$;

create view compliance_findings with (security_invoker=true) as
with cargo as (
  select s.*, (s.eta::timestamp at time zone 'UTC') - case when s.mode = 'air' then interval '2 hours' else interval '48 hours' end as report_due_at
  from shipments s
  where s.direction = 'import' and s.destination_country = 'AU' and s.we_report_cargo and s.cargo_reported_at is null
    and s.eta is not null and s.status not in ('draft','closed','cancelled')
)
-- AU Customs Act 1901 s64AB: house cargo report 48 hours before arrival by sea, 2 hours by air.
select 'shipment'::text as kind, reference, 'AU-ICS-64AB'::text as rule,
  case when now() > report_due_at then 'Breached: house cargo report was due ' || to_char(report_due_at, 'YYYY-MM-DD HH24:MI') || ' UTC'
       else 'Lodge the house cargo report by ' || to_char(report_due_at, 'YYYY-MM-DD HH24:MI') || ' UTC' end as finding,
  case when now() > report_due_at then 1 else 2 end as severity
from cargo where report_due_at < now() + interval '4 days'
-- AU Customs Act 1901 s68: goods over AUD 1,000 need a full import declaration; ABF asks for it 24 hours before arrival.
union all select 'shipment', s.reference, 'AU-DECL-68',
  case when s.ata is not null then 'Arrived ' || s.ata || ' with no import declaration recorded' else 'Lodge the import declaration before ' || s.eta || ' (customs value ' || s.customs_value || ' AUD)' end,
  case when s.ata is not null then 1 else 2 end
from shipments s where s.direction = 'import' and s.destination_country = 'AU' and s.customs_value > 1000 and btrim(s.entry_number) = ''
  and s.status not in ('draft','closed','cancelled') and coalesce(s.ata, s.eta) <= current_date + 2
-- NZ Customs and Excise Act 2018: goods over NZD 1,000 need a standard import declaration, no later than 20 days after arrival.
union all select 'shipment', s.reference, 'NZ-DECL-20',
  case when s.ata is not null and current_date > s.ata + 20 then 'Breached: import declaration was due ' || (s.ata + 20)
       else 'Lodge the import declaration by ' || coalesce(s.ata + 20, s.eta + 20) end,
  case when s.ata is not null and current_date > s.ata + 20 then 1 else 2 end
from shipments s where s.direction = 'import' and s.destination_country = 'NZ' and s.customs_value > 1000 and btrim(s.entry_number) = ''
  and s.status not in ('draft','closed','cancelled') and coalesce(s.ata, s.eta) <= current_date + 2
-- DAFF and MPI BMSB seasonal measures: target high risk goods shipped from a target risk country 1 September to 30 April.
union all select 'shipment', s.reference, 'BMSB-SEASON',
  case when s.atd is not null then 'Shipped ' || s.atd || ' from ' || s.origin_country || ' in the BMSB season with no treatment certificate recorded'
       else 'Treat before shipping: ' || s.origin_country || ' is a target risk country and the sailing is in the BMSB season' end,
  case when s.atd is not null then 1 else 2 end
from shipments s join bmsb_countries b on b.code = s.origin_country
where s.direction = 'import' and s.destination_country in ('AU','NZ') and s.mode <> 'air' and s.bmsb_target_goods
  and btrim(s.bmsb_treatment_cert) = '' and s.status not in ('draft','closed','cancelled')
  and extract(month from coalesce(s.atd, s.etd)) in (9,10,11,12,1,2,3,4)
-- SOLAS chapter VI regulation 2: no container is loaded without a verified gross mass.
union all select 'container', s.reference || '/' || t.number, 'SOLAS-VGM',
  case when now() > s.cargo_cutoff_at then 'Breached: cargo cutoff ' || to_char(s.cargo_cutoff_at, 'YYYY-MM-DD HH24:MI') || ' UTC passed with no VGM' else 'Send the VGM before the cargo cutoff ' || to_char(s.cargo_cutoff_at, 'YYYY-MM-DD HH24:MI') || ' UTC' end,
  case when now() > s.cargo_cutoff_at then 1 else 2 end
from containers t join shipments s on s.id = t.shipment_id
where s.direction = 'export' and s.mode = 'sea-fcl' and t.vgm_kg is null and s.atd is null and s.cargo_cutoff_at is not null
  and s.cargo_cutoff_at < now() + interval '3 days' and s.status not in ('draft','closed','cancelled')
-- IMDG Code 5.4.1 (sea) and IATA DGR 8.1 (air): dangerous goods travel with a dangerous goods declaration.
union all select 'shipment', s.reference, 'DG-DECLARATION',
  case when s.doc_cutoff_at is not null and now() > s.doc_cutoff_at then 'Breached: document cutoff passed with no dangerous goods declaration' else 'Get the dangerous goods declaration from the shipper before the document cutoff' end,
  case when s.doc_cutoff_at is not null and now() > s.doc_cutoff_at then 1 else 2 end
from shipments s where s.dangerous_goods and s.dg_declaration_on is null and s.atd is null and s.direction <> 'import' and s.status not in ('draft','closed','cancelled')
-- House policies. Local rules, not law: change them with /customise.
union all select 'container', f.shipment || '/' || f.number, 'POLICY-FREE-TIME',
  case when f.days_left < 0 then 'Free time ended ' || f.free_until || ', container still out ' || (-f.days_left) || case when f.days_left = -1 then ' day' else ' days' end else 'Free time ends ' || f.free_until || ': return the empty or warn the customer' end,
  case when f.days_left < 0 then 1 else 2 end
from container_free_time f where f.days_left <= 2
union all select 'shipment', p.reference, 'POLICY-UNBILLED',
  case when p.revenue = 0 then 'Delivered ' || p.delivered_on || ' with no revenue charged' else 'Delivered ' || p.delivered_on || ', ' || p.unbilled || ' not invoiced' end,
  case when current_date - p.delivered_on > g.invoice_within_days * 2 then 1 else 2 end
from job_profit p cross join organisation g
where p.delivered_on is not null and p.closed_on is null and (p.unbilled > 0 or p.revenue = 0) and current_date - p.delivered_on > g.invoice_within_days
union all select 'shipment', u.shipment, 'POLICY-UNRECOVERED', u.code || ' cost of ' || u.cost || ' from ' || u.supplier || ' has no matching charge to the customer', 2
from unrecovered_costs u where u.status <> 'closed'
union all select 'shipment', p.reference, 'POLICY-MARGIN', 'Margin ' || p.margin_pct || '% is under the floor of ' || trim(trailing '.' from trim(trailing '0' from g.margin_floor_pct::text)) || '%', 3
from job_profit p cross join organisation g where p.margin_pct is not null and p.margin_pct < g.margin_floor_pct
  and (p.closed_on is null or p.closed_on >= current_date - 30)
union all select 'shipment', s.reference, 'POLICY-ETA', 'ETA ' || s.eta || ' passed with no arrival recorded', 2
from shipments s where s.eta < current_date and s.ata is null and s.status in ('booked','in-transit')
union all select 'shipment', s.reference, 'POLICY-IMPORT', 'Imported draft: confirm the customer, dates and charges, then book it', 3
from shipments s where s.status = 'draft';

revoke all on job_profit, shipment_board, container_free_time, cutoff_queue, arrival_queue, milestone_exceptions, unrecovered_costs, compliance_findings from public;
