-- Initial schema: the v1 data model from docs/spec.md section 8.
-- Money is integer paise (Rs 14.00 = 1400), so totals are exact integer sums.
-- Quantities are numeric(10,3), so "half kilo sugar" is 0.5 of a product sold per kg.

create extension if not exists pg_trgm with schema extensions;

create type public.order_status as enum (
  'draft', 'pending_approval', 'rejected', 'awaiting_payment', 'paid', 'on_credit', 'delivered'
);
create type public.payment_mode as enum ('link', 'credit');
create type public.payment_status as enum ('created', 'paid', 'failed', 'expired');
create type public.bill_status as enum ('uploaded', 'parsed', 'confirmed', 'failed');
create type public.product_unit as enum ('kg', 'litre', 'pack', 'piece');

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_name text not null,
  owner_phone text not null,
  -- Language of the nightly report (F9), as a Sarvam language code.
  owner_language text not null default 'ta-IN',
  -- Reorders (F10) go to this distributor.
  distributor_name text,
  distributor_phone text,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null,
  brand text,
  pack_size text,
  -- Products in the same category can stand in for each other (sugar and jaggery).
  category text not null,
  unit public.product_unit not null,
  price_paise integer not null check (price_paise > 0),
  stock_qty numeric(10, 3) not null default 0 check (stock_qty >= 0),
  low_stock_threshold numeric(10, 3) not null default 0 check (low_stock_threshold >= 0),
  created_at timestamptz not null default now(),
  unique (shop_id, name)
);

-- One row per spoken or written name of a product, so the trigram index compares short strings
-- and every alias carries its language. The same romanization can belong to two languages
-- (uppu is salt in Tamil and Kannada), hence lang in the unique key.
create table public.product_aliases (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products (id) on delete cascade,
  alias text not null,
  lang text not null check (lang in ('en', 'ta', 'hi', 'kn')),
  unique (product_id, alias, lang)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  unique (shop_id, phone)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  customer_id uuid references public.customers (id),
  -- Changes only through lib/orders/state.ts (guardrail 4).
  status public.order_status not null default 'draft',
  payment_mode public.payment_mode,
  -- Computed by lib/orders from order_items; the model never produces it.
  total_paise integer not null default 0 check (total_paise >= 0),
  created_at timestamptz not null default now(),
  -- A draft can be anonymous; once submitted, an order belongs to a customer.
  constraint orders_customer_after_draft check (status = 'draft' or customer_id is not null)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id),
  qty numeric(10, 3) not null check (qty > 0),
  -- Copied from products at order time, so a later price change doesn't alter the order.
  unit_price_paise integer not null check (unit_price_paise > 0),
  unique (order_id, product_id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text not null check (provider in ('paytm', 'mock')),
  provider_link_id text,
  link_url text,
  amount_paise integer not null check (amount_paise > 0),
  status public.payment_status not null default 'created',
  -- The provider's transaction id from the payment callback. Unique, so a repeated callback is a no-op.
  provider_txn_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_link_id)
);

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  customer_id uuid not null references public.customers (id),
  order_id uuid references public.orders (id),
  kind text not null check (kind in ('credit_sale', 'repayment')),
  -- Signed, so a customer's balance is sum(amount_paise): sales add, repayments subtract.
  amount_paise integer not null,
  note text,
  created_at timestamptz not null default now(),
  constraint credit_ledger_sign_matches_kind check (
    (kind = 'credit_sale' and amount_paise > 0) or (kind = 'repayment' and amount_paise < 0)
  ),
  constraint credit_ledger_sale_has_order check (kind <> 'credit_sale' or order_id is not null)
);

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  -- Path inside the private "bills" Storage bucket.
  image_path text not null,
  status public.bill_status not null default 'uploaded',
  -- Rows read from the photo, saved only after Zod validation.
  parsed_items jsonb,
  created_at timestamptz not null default now()
);

-- Every agent action, owner decision and payment callback (guardrail 6).
-- No cascade: an audit trail is not deleted along with its shop.
create table public.audit_log (
  id bigint generated always as identity primary key,
  shop_id uuid references public.shops (id),
  actor text not null check (actor in ('agent', 'owner', 'customer', 'system', 'paytm', 'n8n')),
  action text not null,
  entity_type text,
  entity_id uuid,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Indexes, each for a query in the spec. Unique constraints above already index
-- products, aliases and customers by their leading columns.

-- Product search (docs/CONTRIBUTING.md): trigram similarity over every alias.
create index product_aliases_alias_trgm_idx
  on public.product_aliases using gin (alias extensions.gin_trgm_ops);
-- Owner's pending-approval cards.
create index orders_shop_status_idx on public.orders (shop_id, status);
-- Nightly report and recent orders.
create index orders_shop_created_idx on public.orders (shop_id, created_at desc);
-- Joins along foreign keys.
create index orders_customer_idx on public.orders (customer_id);
create index order_items_product_idx on public.order_items (product_id);
create index payments_order_idx on public.payments (order_id);
-- Credit book: balance and history per customer.
create index credit_ledger_shop_customer_idx on public.credit_ledger (shop_id, customer_id);
create index bills_shop_created_idx on public.bills (shop_id, created_at desc);
create index audit_log_shop_created_idx on public.audit_log (shop_id, created_at desc);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);

-- Idempotency (guardrail 5): however often an approval or a callback repeats,
-- an order has at most one live or paid payment link and at most one credit sale.
create unique index payments_one_live_per_order_idx
  on public.payments (order_id) where status in ('created', 'paid');
create unique index credit_ledger_one_sale_per_order_idx
  on public.credit_ledger (order_id) where kind = 'credit_sale';

-- Product search for the agent's search_products tool: the best-matching alias per product,
-- strongest match first. The model supplies only the query text; everything else is data.
create function public.search_products(p_shop_id uuid, p_query text, p_limit integer default 5)
returns table (product_id uuid, product_name text, matched_alias text, lang text, score real)
language sql
stable
set search_path = ''
as $$
  select best.product_id, best.product_name, best.matched_alias, best.lang, best.score
  from (
    select distinct on (p.id)
      p.id as product_id,
      p.name as product_name,
      a.alias as matched_alias,
      a.lang,
      extensions.similarity(a.alias, p_query) as score
    from public.product_aliases a
    join public.products p on p.id = a.product_id
    where p.shop_id = p_shop_id
      and a.alias operator(extensions.%) p_query
    order by p.id, score desc
  ) best
  order by best.score desc
  limit p_limit;
$$;

-- Row Level Security on every table with no policies yet: only the server, using the secret key
-- (service_role bypasses RLS), can read or write. Browser access arrives with Realtime in M4.
alter table public.shops enable row level security;
alter table public.products enable row level security;
alter table public.product_aliases enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.bills enable row level security;
alter table public.audit_log enable row level security;

-- Hosted Supabase no longer exposes new public tables automatically, so the server role is
-- granted explicitly. Browser roles get nothing until M4. Later tables inherit the same access.
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
revoke all on all tables in schema public from anon, authenticated;
revoke execute on function public.search_products(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.search_products(uuid, text, integer) to service_role;
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;

-- Private bucket for distributor bill photos (milestone 5).
insert into storage.buckets (id, name, public)
values ('bills', 'bills', false)
on conflict (id) do nothing;
