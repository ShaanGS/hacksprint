-- The bill-pay agent (decision of Oct 18). The owner sets a mandate by tapping chips: how much the
-- agent may pay in any 7 days and how much money must stay in hand. The agent decides pay or hold
-- for each due bill and prepares a UPI link to the distributor's own UPI id; the owner pays from
-- his own UPI app with his PIN and then says he paid, so the record is his word (owner_said). We
-- never hold or move the money (rule 8).

-- One live mandate per shop. A new one revokes the old row instead of overwriting it, so every
-- limit the owner ever set stays on record.
create table public.bill_pay_mandates (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  weekly_limit_paise integer not null check (weekly_limit_paise > 0),
  keep_in_hand_paise integer not null check (keep_in_hand_paise >= 0),
  source public.source_label not null default 'owner_said',
  set_at timestamptz not null default now(),
  revoked_at timestamptz
);
create unique index bill_pay_mandates_live_idx on public.bill_pay_mandates (shop_id)
  where revoked_at is null;

-- Where the agent sends the owner's UPI app. Empty until known; the agent holds those bills.
alter table public.distributors add column upi_id text;

-- Which agent run a bill was paid under: these payments count against the weekly limit.
alter table public.payables add column agent_run_id uuid references public.agent_runs (id) on delete set null;
create index payables_agent_paid_idx on public.payables (shop_id, paid_at)
  where agent_run_id is not null;

-- RLS on, no policies: only the server (service role) reads and writes.
alter table public.bill_pay_mandates enable row level security;
grant select, insert, update, delete on public.bill_pay_mandates to service_role;
revoke all on public.bill_pay_mandates from anon, authenticated;

-- The reset as in 20261017140100_rotation_demo.sql, plus the demo distributors' UPI ids. They use
-- a handle no UPI app has registered, so a tap on stage can never send real money anywhere.
-- Mandates and agent runs go with their shop (on delete cascade), and payables are cleared before
-- the shops, so nothing here needs its own delete.
create or replace function public.reset_demo()
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_shop uuid;
begin
  delete from public.loan_packs where true;
  delete from public.loan_requests where true;
  delete from public.statements where true;
  delete from public.audit_log where true;
  delete from public.voice_turns where true;
  delete from public.credit_ledger where true;
  delete from public.payments where true;
  delete from public.credit_reminders where true;
  delete from public.day_close where true;
  delete from public.shelf_counts where true;
  delete from public.owner_voice_entries where true;
  delete from public.shop_costs where true;
  delete from public.shop_profile where true;
  delete from public.delivery_checks where true;
  delete from public.payables where true;
  delete from public.purchase_order_items where true;
  update public.products set price_source = null where true;
  delete from public.order_items where true;
  delete from public.orders where true;
  delete from public.reorders where true;
  delete from public.bill_items where true;
  delete from public.bills where true;
  delete from public.purchase_orders where true;
  delete from public.distributors where true;
  delete from public.customers where true;
  delete from public.product_aliases where true;
  delete from public.products where true;
  delete from public.shops where true;

  perform public.seed_demo();
  select id into v_shop from public.shops limit 1;
  delete from public.credit_ledger where shop_id = v_shop;
  delete from public.payments where shop_id = v_shop;
  delete from public.order_items where order_id in (select id from public.orders where shop_id = v_shop);
  delete from public.orders where shop_id = v_shop;
  perform public.seed_demo_rotation(v_shop);
  update public.distributors set upi_id = 'sribalaji.demo@example'
  where shop_id = v_shop and name = 'Sri Balaji Agencies';
  update public.distributors set upi_id = 'murugantraders.demo@example'
  where shop_id = v_shop and name = 'Murugan Traders';
end;
$$;

revoke execute on function public.reset_demo() from public, anon, authenticated;
grant execute on function public.reset_demo() to service_role;
