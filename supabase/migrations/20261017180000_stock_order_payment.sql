-- A payment for a stock order the reorder agent sent (decision of Oct 17, test mode only). It is
-- money going out, not coming in, so every reader of payments for sales or cash leaves it out
-- (lib/rotation/load.ts), and paying it never changes the shop's numbers.
alter table public.payments
  add column purchase_order_id uuid references public.purchase_orders (id) on delete cascade;

create index payments_purchase_order_idx on public.payments (purchase_order_id)
  where purchase_order_id is not null;
