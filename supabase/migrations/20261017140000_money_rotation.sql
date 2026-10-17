-- Spec v4.1 (section 12): money rotation and loans. A new migration on top of v2; nothing above
-- is edited. Every number keeps a source label (spec rule 5), sales come in as verified payments
-- and the cash the owner says at night, and credit can be given, repaid and reminded about
-- without an order.

create type public.source_label as enum ('verified_payment', 'supplier_bill', 'owner_said', 'estimate');

-- What the owner said (B1), read into one entry and kept until he confirms or rejects it.
create table public.owner_voice_entries (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  kind text not null check (kind in ('credit_given', 'credit_repaid_cash', 'day_close', 'stock_count')),
  transcript text not null,
  lang text not null check (lang in ('en', 'ta', 'hi', 'kn')),
  parsed jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index owner_voice_entries_shop_created_idx on public.owner_voice_entries (shop_id, created_at desc);

-- The night's line: today's cash sales and the money in hand, cash and bank together, roughly.
create table public.day_close (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  business_date date not null,
  cash_sales_paise integer check (cash_sales_paise >= 0),
  money_in_hand_paise integer check (money_in_hand_paise >= 0),
  source public.source_label not null default 'owner_said' check (source = 'owner_said'),
  recorded_at timestamptz not null default now(),
  voice_entry_id uuid references public.owner_voice_entries (id),
  unique (shop_id, business_date)
);

-- Weekly costs from the one-time setup (B7): rent, staff, home, usual cash purchases.
create table public.shop_costs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  kind text not null check (kind in ('rent', 'staff', 'home', 'cash_purchases', 'other')),
  amount_paise integer not null check (amount_paise >= 0),
  period text not null check (period in ('week', 'month')),
  source public.source_label not null default 'owner_said',
  created_at timestamptz not null default now()
);
create index shop_costs_shop_idx on public.shop_costs (shop_id);

-- What the loan-ready check needs and nothing else (spec section 10). The owner's language stays
-- on shops.owner_language rather than being copied here.
create table public.shop_profile (
  shop_id uuid primary key references public.shops (id) on delete cascade,
  udyam_status text not null default 'unsure' check (udyam_status in ('yes', 'no', 'unsure')),
  has_pan boolean not null default false,
  has_gst boolean not null default false,
  repaid_tarun_before boolean not null default false,
  bank_name text
);

-- The festival order and the bill it became (9.14, D4).
alter table public.purchase_orders add column festival text;
alter table public.purchase_orders add column approved_at timestamptz;
alter table public.bills add column purchase_order_id uuid references public.purchase_orders (id);
create index bills_purchase_order_idx on public.bills (purchase_order_id);

-- Dues: supplier bills now, loan EMIs later (9.16, P1), and how each was paid. A bill paid in
-- cash or from the bank is the owner's word; only a payment a provider saw is verified.
alter table public.payables add column kind text not null default 'supplier_bill'
  check (kind in ('supplier_bill', 'loan_emi'));
alter table public.payables alter column bill_id drop not null;
alter table public.payables add constraint payables_bill_matches_kind
  check ((kind = 'supplier_bill') = (bill_id is not null));
alter table public.payables add column paid_via text check (paid_via in ('cash', 'bank', 'upi', 'paytm'));

-- Payments without an order: digital sales a provider confirmed, and credit repaid by link.
alter table public.payments add column shop_id uuid references public.shops (id) on delete cascade;
update public.payments p set shop_id = o.shop_id from public.orders o where o.id = p.order_id;
alter table public.payments alter column shop_id set not null;
alter table public.payments alter column order_id drop not null;
alter table public.payments add column customer_id uuid references public.customers (id);
alter table public.payments add column is_credit_repayment boolean not null default false;
create index payments_shop_paid_idx on public.payments (shop_id, paid_at) where status = 'paid';

-- An order's payment can still be written without its shop (the frozen ordering code and the
-- v1 seed do); the order says which shop it is.
create function public.payments_fill_shop()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.shop_id is null and new.order_id is not null then
    select o.shop_id into new.shop_id from public.orders o where o.id = new.order_id;
  end if;
  return new;
end;
$$;
create trigger payments_fill_shop before insert on public.payments
  for each row execute function public.payments_fill_shop();

-- Reminders go from the owner's own WhatsApp (A4): the message and link we built for him.
alter table public.credit_reminders add column shop_id uuid not null references public.shops (id) on delete cascade;
alter table public.credit_reminders add column channel text not null default 'whatsapp_link'
  check (channel = 'whatsapp_link');
alter table public.credit_reminders add column message_text text;
alter table public.credit_reminders add column payment_link_url text;
alter table public.credit_reminders add column opened_at timestamptz;
alter table public.payments add column reminder_id uuid references public.credit_reminders (id);
create index payments_reminder_idx on public.payments (reminder_id);

-- Where each credit entry came from. A payment settles credit once, which makes a repeated
-- payment callback harmless (spec rule 4).
alter table public.credit_ledger add column source public.source_label not null default 'owner_said';
alter table public.credit_ledger add column payment_id uuid references public.payments (id);
alter table public.credit_ledger add column voice_entry_id uuid references public.owner_voice_entries (id);
alter table public.credit_ledger add constraint credit_ledger_verified_has_payment
  check (source <> 'verified_payment' or payment_id is not null);
create unique index credit_ledger_payment_once_idx on public.credit_ledger (payment_id) where payment_id is not null;
create index credit_ledger_customer_created_idx on public.credit_ledger (customer_id, created_at);

alter table public.shelf_counts add column source public.source_label not null default 'owner_said';
alter table public.shelf_counts add column voice_entry_id uuid references public.owner_voice_entries (id);

-- A statement is a document: its numbers are frozen when it is made, and its link shares it.
create table public.statements (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  payload jsonb not null,
  share_token text not null unique,
  generated_at timestamptz not null default now()
);
create index statements_shop_generated_idx on public.statements (shop_id, generated_at desc);

create table public.loan_requests (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  need_paise integer not null check (need_paise >= 0),
  gap_without_order_paise integer not null,
  can_collect_paise integer not null check (can_collect_paise >= 0),
  loan_needed_paise integer not null check (loan_needed_paise >= 0),
  purpose text not null check (purpose in ('stock_rotation', 'equipment')),
  source text not null check (source in ('festival_order', 'owner_said')),
  purchase_order_id uuid references public.purchase_orders (id),
  created_at timestamptz not null default now()
);
create index loan_requests_shop_created_idx on public.loan_requests (shop_id, created_at desc);

create table public.loan_packs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  loan_request_id uuid not null references public.loan_requests (id) on delete cascade,
  scheme_band text not null,
  checklist jsonb not null,
  statement_id uuid not null references public.statements (id),
  share_token text not null unique,
  generated_at timestamptz not null default now()
);

-- Confirming a bill (B1 to B4) now records when the bill is due: the date the bill prints, else
-- the distributor's terms from the bill date. Everything else is as before.
drop function public.confirm_bill(uuid, uuid, jsonb);
create function public.confirm_bill(p_bill_id uuid, p_distributor_id uuid, p_lines jsonb, p_due_date date)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_bill public.bills%rowtype;
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_terms integer;
  v_line jsonb;
  v_product_id uuid;
  v_qty numeric;
  v_cost integer;
  v_mrp integer;
  v_line_total integer;
  v_previous integer;
  v_name text;
  v_item_id uuid;
  v_total integer := 0;
  v_issues jsonb := '[]'::jsonb;
  v_order_id uuid;
  v_ordered record;
  v_received numeric;
begin
  -- Only a parsed bill can be confirmed, so a double tap does nothing the second time.
  update public.bills
  set status = 'confirmed', distributor_id = p_distributor_id, billed_on = coalesce(billed_on, v_today)
  where id = p_bill_id and status = 'parsed'
  returning * into v_bill;
  if not found then
    raise exception 'bill % is not waiting for confirmation', p_bill_id;
  end if;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_product_id := (v_line ->> 'product_id')::uuid;
    v_qty := (v_line ->> 'qty')::numeric;
    v_cost := (v_line ->> 'unit_cost_paise')::integer;
    v_mrp := nullif(v_line ->> 'mrp_paise', '')::integer;
    v_line_total := round(v_qty * v_cost)::integer;

    select bi.unit_cost_paise into v_previous
    from public.bill_items bi
    join public.bills b on b.id = bi.bill_id
    where bi.product_id = v_product_id and b.id <> p_bill_id
      and b.distributor_id = p_distributor_id and b.status = 'confirmed'
    order by bi.created_at desc
    limit 1;

    insert into public.bill_items (bill_id, product_id, qty, unit_cost_paise, mrp_paise, line_total_paise)
    values (p_bill_id, v_product_id, v_qty, v_cost, v_mrp, v_line_total)
    returning id into v_item_id;
    v_total := v_total + v_line_total;

    update public.products
    set stock_qty = stock_qty + v_qty,
        price_paise = coalesce(v_mrp, price_paise),
        price_source = case when v_mrp is null then price_source else v_item_id end
    where id = v_product_id and shop_id = v_bill.shop_id
    returning name into v_name;

    if v_previous is not null and v_cost > v_previous then
      v_issues := v_issues || jsonb_build_object(
        'type', 'price_up', 'product_id', v_product_id, 'name', v_name,
        'old_cost_paise', v_previous, 'new_cost_paise', v_cost
      );
    end if;
  end loop;

  select d.payment_terms_days into v_terms from public.distributors d where d.id = p_distributor_id;
  if v_total > 0 then
    insert into public.payables (shop_id, distributor_id, bill_id, amount_paise, due_date)
    values (
      v_bill.shop_id, p_distributor_id, p_bill_id, v_total,
      coalesce(p_due_date, v_bill.billed_on + coalesce(v_terms, 15))
    );
  end if;

  -- The delivery answers the latest order sent to this distributor (B4).
  select po.id into v_order_id
  from public.purchase_orders po
  where po.distributor_id = p_distributor_id and po.status = 'sent'
  order by po.created_at desc
  limit 1;

  if v_order_id is not null then
    for v_ordered in
      select poi.product_id, poi.qty_ordered, p.name
      from public.purchase_order_items poi
      join public.products p on p.id = poi.product_id
      where poi.purchase_order_id = v_order_id
    loop
      select coalesce(sum(bi.qty), 0) into v_received
      from public.bill_items bi
      where bi.bill_id = p_bill_id and bi.product_id = v_ordered.product_id;
      if v_received = 0 then
        v_issues := v_issues || jsonb_build_object(
          'type', 'missing', 'product_id', v_ordered.product_id, 'name', v_ordered.name,
          'ordered', v_ordered.qty_ordered
        );
      elsif v_received <> v_ordered.qty_ordered then
        v_issues := v_issues || jsonb_build_object(
          'type', 'qty_mismatch', 'product_id', v_ordered.product_id, 'name', v_ordered.name,
          'ordered', v_ordered.qty_ordered, 'received', v_received
        );
      end if;
    end loop;
    update public.purchase_orders set status = 'checked' where id = v_order_id;
  end if;

  insert into public.delivery_checks (purchase_order_id, bill_id, issues)
  values (v_order_id, p_bill_id, v_issues);

  insert into public.audit_log (shop_id, actor, action, entity_type, entity_id, payload)
  values (
    v_bill.shop_id, 'owner', 'bill.confirmed', 'bill', p_bill_id,
    jsonb_build_object('lines', jsonb_array_length(p_lines), 'total_paise', v_total, 'issues', v_issues)
  );
  return v_issues;
end;
$$;

-- The v2 home numbers and order history are replaced by lib/rotation and the seed below.
drop function public.home_numbers(uuid, timestamptz);
drop function public.seed_demo_history(uuid);

-- RLS on, no policies: only the server (service role) reads and writes.
alter table public.owner_voice_entries enable row level security;
alter table public.day_close enable row level security;
alter table public.shop_costs enable row level security;
alter table public.shop_profile enable row level security;
alter table public.statements enable row level security;
alter table public.loan_requests enable row level security;
alter table public.loan_packs enable row level security;

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
revoke all on public.owner_voice_entries, public.day_close, public.shop_costs, public.shop_profile,
  public.statements, public.loan_requests, public.loan_packs
  from anon, authenticated;

revoke execute on function public.confirm_bill(uuid, uuid, jsonb, date) from public, anon, authenticated;
grant execute on function public.confirm_bill(uuid, uuid, jsonb, date) to service_role;
revoke execute on function public.payments_fill_shop() from public, anon, authenticated;
