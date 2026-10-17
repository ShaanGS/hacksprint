-- Spec v2 data model (section 8): the shop's distributors and their bills, purchase orders and
-- the check of each delivery against its order, what the shop owes, shelf counts, credit
-- reminders, and each regular's usual basket. Money is integer paise; quantities numeric(10,3).

create table public.distributors (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null,
  -- Reorders go here on the messaging app (spec B3).
  phone text not null,
  payment_terms_days integer not null default 15 check (payment_terms_days >= 0),
  created_at timestamptz not null default now(),
  unique (shop_id, name)
);

-- A bill photo becomes a confirmed bill with lines; seeded history bills have no photo.
alter table public.bills alter column image_path drop not null;
alter table public.bills add column distributor_id uuid references public.distributors (id);
alter table public.bills add column bill_number text;
alter table public.bills add column billed_on date;
create index bills_distributor_idx on public.bills (distributor_id, billed_on desc);

create table public.bill_items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills (id) on delete cascade,
  product_id uuid not null references public.products (id),
  qty numeric(10, 3) not null check (qty > 0),
  -- What the shop pays per unit: the basis of margins and price-rise alerts.
  unit_cost_paise integer not null check (unit_cost_paise > 0),
  -- The printed selling price; confirming a bill sets the product's price from it.
  mrp_paise integer check (mrp_paise > 0),
  line_total_paise integer not null check (line_total_paise >= 0),
  created_at timestamptz not null default now()
);
create index bill_items_bill_idx on public.bill_items (bill_id);
-- Latest cost per product, for price alerts and margins.
create index bill_items_product_created_idx on public.bill_items (product_id, created_at desc);

-- Where a product's price came from, and where an order line's price came from (spec rule 6).
alter table public.products add column price_source uuid references public.bill_items (id);
alter table public.order_items add column price_source uuid references public.bill_items (id);

-- The language a customer orders in, so the owner sees whose language it was (spec A2).
alter table public.customers add column lang text check (lang in ('en', 'ta', 'hi', 'kn'));
alter table public.orders add column lang text check (lang in ('en', 'ta', 'hi', 'kn'));

create type public.purchase_order_status as enum ('draft', 'sent', 'delivered', 'checked');

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  distributor_id uuid not null references public.distributors (id),
  status public.purchase_order_status not null default 'draft',
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index purchase_orders_shop_created_idx on public.purchase_orders (shop_id, created_at desc);
-- The open order a delivery is checked against.
create index purchase_orders_distributor_status_idx on public.purchase_orders (distributor_id, status);

create table public.purchase_order_items (
  id bigint generated always as identity primary key,
  purchase_order_id uuid not null references public.purchase_orders (id) on delete cascade,
  product_id uuid not null references public.products (id),
  qty_ordered numeric(10, 3) not null check (qty_ordered > 0),
  unique (purchase_order_id, product_id)
);

create table public.delivery_checks (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid references public.purchase_orders (id),
  bill_id uuid not null references public.bills (id) on delete cascade,
  -- [{type: missing | qty_mismatch | price_up, product_id, name, ...}], built by confirm_bill.
  issues jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index delivery_checks_bill_idx on public.delivery_checks (bill_id);

create table public.payables (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  distributor_id uuid not null references public.distributors (id),
  bill_id uuid not null unique references public.bills (id) on delete cascade,
  amount_paise integer not null check (amount_paise > 0),
  due_date date not null,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
-- What is still owed, soonest first.
create index payables_shop_due_idx on public.payables (shop_id, due_date) where paid_at is null;

create table public.shelf_counts (
  id bigint generated always as identity primary key,
  shop_id uuid not null references public.shops (id) on delete cascade,
  product_id uuid not null references public.products (id),
  counted_qty numeric(10, 3) not null check (counted_qty >= 0),
  counted_at timestamptz not null default now()
);
create index shelf_counts_product_counted_idx on public.shelf_counts (product_id, counted_at desc);

create table public.credit_reminders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  amount_paise integer not null check (amount_paise > 0),
  language text not null check (language in ('en', 'ta', 'hi', 'kn')),
  -- The payment provider's link id; a paid link clears the entry (spec D2).
  payment_link_id text,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'failed')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index credit_reminders_customer_idx on public.credit_reminders (customer_id, created_at desc);

-- A regular's usual basket (spec A3): products in at least half of their orders over the last
-- 60 days, at the quantity they buy most often. Only customers with three or more orders count.
create view public.customer_usual
with (security_invoker = true) as
with past as (
  select o.customer_id, o.id as order_id
  from public.orders o
  where o.status in ('paid', 'on_credit', 'delivered')
    and o.created_at > now() - interval '60 days'
),
order_counts as (
  select customer_id, count(*) as orders
  from past
  group by customer_id
),
per_product as (
  select past.customer_id, oi.product_id, count(*) as times,
    mode() within group (order by oi.qty) as usual_qty
  from past
  join public.order_items oi on oi.order_id = past.order_id
  group by past.customer_id, oi.product_id
)
select pp.customer_id, pp.product_id, pp.usual_qty, pp.times, oc.orders
from per_product pp
join order_counts oc on oc.customer_id = pp.customer_id
where oc.orders >= 3 and pp.times * 2 >= oc.orders;

alter table public.distributors enable row level security;
alter table public.bill_items enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.delivery_checks enable row level security;
alter table public.payables enable row level security;
alter table public.shelf_counts enable row level security;
alter table public.credit_reminders enable row level security;

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
revoke all on public.distributors, public.bill_items, public.purchase_orders,
  public.purchase_order_items, public.delivery_checks, public.payables, public.shelf_counts,
  public.credit_reminders, public.customer_usual
  from anon, authenticated;
