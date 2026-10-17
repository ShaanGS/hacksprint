-- What the order flow needs beyond the initial schema (docs/PRODUCT-PLAN.md, Logic).

-- The agent sees products as short readable codes ("sugar", "maggi"), never ids or prices.
-- `art` names the picture each product uses on screen.
alter table public.products add column code text not null;
alter table public.products add column art text not null default 'bag';
create unique index products_shop_code_idx on public.products (shop_id, code);

-- A short number customers can say aloud ("order 42"); Paytm link names allow only letters
-- and digits, so "Order42" works there too.
alter table public.orders add column number bigint generated always as identity;
create unique index orders_number_idx on public.orders (number);
alter table public.orders add column submitted_at timestamptz;
-- A customer's cart is their one draft order; two requests racing to create it get the same one.
create unique index orders_one_draft_per_customer_idx
  on public.orders (customer_id) where status = 'draft';

-- Cart lines stay in the order they were added.
alter table public.order_items add column created_at timestamptz not null default now();

-- Reasons are codes, so the customer's screen can show them in the customer's language.
create type public.reject_reason as enum ('out_of_stock', 'shop_closed', 'cannot_deliver', 'other');
alter table public.orders add column reject_reason public.reject_reason;

-- Which payment page approvals create links on. Stored here, not in env, so the presenter
-- can switch it during the event without a redeploy.
alter table public.shops
  add column payment_mode text not null default 'test' check (payment_mode in ('test', 'paytm'));
alter table public.payments drop constraint payments_provider_check;
alter table public.payments add constraint payments_provider_check check (provider in ('paytm', 'test'));

-- One row per spoken, typed or tapped turn, with how long each stage took (target: under 4 s).
create table public.voice_turns (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  role text not null check (role in ('customer', 'shop')),
  text text not null,
  lang text not null,
  source text not null check (source in ('voice', 'typed', 'chip', 'agent', 'template')),
  choices jsonb not null default '[]',
  -- Product cards shown with the shop's reply: what it added and what is out of stock.
  items jsonb not null default '[]',
  stt_ms integer,
  agent_ms integer,
  created_at timestamptz not null default now()
);
create index voice_turns_order_idx on public.voice_turns (order_id, created_at);

-- Restock requests the owner confirmed; n8n sends them to the distributor.
create table public.reorders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  items jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index reorders_shop_created_idx on public.reorders (shop_id, created_at desc);

alter table public.voice_turns enable row level security;
alter table public.reorders enable row level security;
revoke all on public.voice_turns, public.reorders from anon, authenticated;

-- The only way an order changes status (guardrail 4: called only from lib/orders/state.ts).
-- One transaction: the status moves only if it is still `p_from`, so a repeated approval or
-- payment callback changes nothing and returns false. Paid and on-credit orders take their
-- items out of stock, stopping at zero and logging the oversell rather than failing after the
-- money has moved. On-credit orders add the sale to the credit ledger.
create function public.transition_order(
  p_order_id uuid,
  p_from public.order_status,
  p_to public.order_status,
  p_actor text,
  p_reason public.reject_reason default null
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
begin
  update public.orders
  set status = p_to,
      reject_reason = coalesce(p_reason, reject_reason),
      submitted_at = case when p_to = 'pending_approval' then now() else submitted_at end
  where id = p_order_id and status = p_from
  returning * into v_order;

  if not found then
    return false;
  end if;

  if p_to in ('paid', 'on_credit') then
    for v_item in
      select oi.product_id, oi.qty, p.stock_qty
      from public.order_items oi
      join public.products p on p.id = oi.product_id
      where oi.order_id = p_order_id
      for update of p
    loop
      if v_item.stock_qty < v_item.qty then
        insert into public.audit_log (shop_id, actor, action, entity_type, entity_id, payload)
        values (
          v_order.shop_id, 'system', 'stock.oversold', 'product', v_item.product_id,
          jsonb_build_object('order_id', p_order_id, 'qty', v_item.qty, 'stock_qty', v_item.stock_qty)
        );
      end if;
      update public.products
      set stock_qty = greatest(stock_qty - v_item.qty, 0)
      where id = v_item.product_id;
    end loop;
  end if;

  if p_to = 'on_credit' then
    insert into public.credit_ledger (shop_id, customer_id, order_id, kind, amount_paise)
    values (v_order.shop_id, v_order.customer_id, v_order.id, 'credit_sale', v_order.total_paise);
  end if;

  insert into public.audit_log (shop_id, actor, action, entity_type, entity_id, payload)
  values (
    v_order.shop_id, p_actor, 'order.status_changed', 'order', v_order.id,
    jsonb_build_object('from', p_from, 'to', p_to, 'reason', p_reason)
  );
  return true;
end;
$$;

revoke execute on function public.transition_order(
  uuid, public.order_status, public.order_status, text, public.reject_reason
) from public, anon, authenticated;
grant execute on function public.transition_order(
  uuid, public.order_status, public.order_status, text, public.reject_reason
) to service_role;
