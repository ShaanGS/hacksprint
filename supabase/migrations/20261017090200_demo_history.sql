-- The demo shop's history for spec v2 (section 11, step 1), loaded after seed_demo():
-- two distributors with last month's bills, costs and payables; Lakshmi Raman's three weeks of
-- the same basket, so "the usual" is real; 90 days of paid orders for the loan card; credit that
-- was repaid; and this morning's order to Sri Balaji Agencies, which today's delivery bill is
-- checked against (the fixture leaves out the Gold Winner oil and charges 8% more for atta).
-- Everything is placed relative to now, and nothing is random, so every reset looks the same.
create function public.seed_demo_history(p_shop uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_today timestamptz := date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
  v_balaji uuid;
  v_murugan uuid;
  v_order uuid;
  v_customers uuid[] := array[
    '00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000000c3',
    '00000000-0000-4000-8000-0000000000c4', '00000000-0000-4000-8000-0000000000c5',
    '00000000-0000-4000-8000-0000000000c6', '00000000-0000-4000-8000-0000000000c7',
    '00000000-0000-4000-8000-0000000000c8'
  ]::uuid[];
  v_codes text[];
  v_day integer;
  v_slot integer;
  v_count integer;
  v_k integer;
  v_placed timestamptz;
  v_credit boolean;
begin
  update public.customers set lang = 'ta' where id = '00000000-0000-4000-8000-0000000000c1';
  update public.customers set lang = 'hi' where id = '00000000-0000-4000-8000-0000000000c2';
  update public.customers set lang = 'ta' where id = '00000000-0000-4000-8000-0000000000c3';
  update public.customers set lang = 'kn' where id = '00000000-0000-4000-8000-0000000000c4';
  insert into public.customers (id, shop_id, name, phone, lang)
  values
    ('00000000-0000-4000-8000-0000000000c5', p_shop, 'Priya Natarajan', '+910000000015', 'ta'),
    ('00000000-0000-4000-8000-0000000000c6', p_shop, 'Imran Khan', '+910000000016', 'hi'),
    ('00000000-0000-4000-8000-0000000000c7', p_shop, 'Divya Shetty', '+910000000017', 'kn'),
    ('00000000-0000-4000-8000-0000000000c8', p_shop, 'Karthik Subramanian', '+910000000018', 'en'),
    -- Buys at the counter on account, never through the voice page: the spoken credit regular.
    ('00000000-0000-4000-8000-0000000000c9', p_shop, 'Ramesh Kumar', '+910000000019', 'ta');

  insert into public.distributors (shop_id, name, phone, payment_terms_days)
  values (p_shop, 'Sri Balaji Agencies', '+910000000002', 15)
  returning id into v_balaji;
  insert into public.distributors (shop_id, name, phone, payment_terms_days)
  values (p_shop, 'Murugan Traders', '+910000000003', 7)
  returning id into v_murugan;

  -- Last month's bills. Costs are whole rupees, about 86% of the printed price; Murugan Traders
  -- is a little cheaper on the three products both of them sell, which the margin screen shows.
  insert into public.bills (id, shop_id, distributor_id, bill_number, billed_on, status, created_at)
  values
    ('00000000-0000-4000-8000-0000000000e1', p_shop, v_balaji, 'SB-2041', (v_today - interval '24 days')::date, 'confirmed', v_today - interval '24 days' + interval '10 hours'),
    ('00000000-0000-4000-8000-0000000000e2', p_shop, v_balaji, 'SB-2058', (v_today - interval '10 days')::date, 'confirmed', v_today - interval '10 days' + interval '10 hours'),
    ('00000000-0000-4000-8000-0000000000e3', p_shop, v_murugan, 'MT-118', (v_today - interval '20 days')::date, 'confirmed', v_today - interval '20 days' + interval '9 hours'),
    ('00000000-0000-4000-8000-0000000000e4', p_shop, v_murugan, 'MT-131', (v_today - interval '6 days')::date, 'confirmed', v_today - interval '6 days' + interval '9 hours');

  insert into public.bill_items (bill_id, product_id, qty, unit_cost_paise, mrp_paise, line_total_paise, created_at)
  select b.id, p.id, x.qty,
    round(p.price_paise * x.cost_share / 100.0)::integer * 100,
    p.price_paise,
    round(x.qty * round(p.price_paise * x.cost_share / 100.0) * 100)::integer,
    b.created_at
  from (values
    -- bill, product code, quantity, cost as a share of the printed price
    ('e1', 'ponni-rice', 50, 0.86), ('e1', 'idli-rice', 30, 0.86), ('e1', 'toor-dal', 20, 0.86),
    ('e1', 'moong-dal', 15, 0.86), ('e1', 'urad-dal', 15, 0.86), ('e1', 'sugar', 25, 0.86),
    ('e1', 'jaggery', 10, 0.86), ('e1', 'atta', 12, 0.86), ('e1', 'rava', 10, 0.86),
    ('e1', 'salt', 40, 0.86), ('e1', 'gold-winner-oil', 12, 0.86), ('e1', 'fortune-oil', 10, 0.86),
    ('e1', 'gingelly-oil', 6, 0.86), ('e1', 'sambar-powder', 15, 0.86), ('e1', 'chilli-powder', 15, 0.86),
    ('e1', 'turmeric', 12, 0.86), ('e1', 'tea', 10, 0.86), ('e1', 'coffee', 8, 0.86),
    ('e2', 'ponni-rice', 40, 0.86), ('e2', 'toor-dal', 15, 0.86), ('e2', 'sugar', 20, 0.86),
    ('e2', 'atta', 10, 0.86), ('e2', 'salt', 30, 0.86), ('e2', 'gold-winner-oil', 10, 0.86),
    ('e2', 'tea', 6, 0.86), ('e2', 'maggi', 48, 0.88),
    ('e3', 'aavin-milk', 40, 0.84), ('e3', 'arokya-milk', 24, 0.84), ('e3', 'butter', 12, 0.84),
    ('e3', 'curd', 20, 0.84), ('e3', 'ghee', 6, 0.84), ('e3', 'eggs', 90, 0.84),
    ('e3', 'bread', 10, 0.84), ('e3', 'batter', 12, 0.84), ('e3', 'chips', 24, 0.84),
    ('e3', 'biscuits', 40, 0.84), ('e3', 'coke', 12, 0.84), ('e3', 'water', 24, 0.84),
    ('e3', 'toothpaste', 10, 0.84), ('e3', 'soap', 12, 0.84), ('e3', 'coconut-oil', 10, 0.84),
    ('e3', 'detergent', 8, 0.84), ('e3', 'dishwash', 12, 0.84), ('e3', 'matchbox', 15, 0.84),
    ('e3', 'onion', 20, 0.84), ('e3', 'tomato', 15, 0.84), ('e3', 'coconut', 20, 0.84),
    ('e4', 'aavin-milk', 40, 0.84), ('e4', 'butter', 12, 0.84), ('e4', 'bread', 10, 0.84),
    ('e4', 'eggs', 60, 0.84), ('e4', 'maggi', 48, 0.84), ('e4', 'atta', 6, 0.83),
    ('e4', 'gold-winner-oil', 6, 0.83)
  ) as x (bill, code, qty, cost_share)
  join public.bills b on b.id = ('00000000-0000-4000-8000-0000000000' || x.bill)::uuid
  join public.products p on p.shop_id = p_shop and p.code = x.code;

  -- Each price points at the latest bill line that printed it (spec rule 6).
  update public.products p
  set price_source = latest.id
  from (
    select distinct on (bi.product_id) bi.product_id, bi.id
    from public.bill_items bi
    order by bi.product_id, bi.created_at desc
  ) latest
  where p.id = latest.product_id and p.shop_id = p_shop;

  -- What the shop owed for them: the older two paid (one two days late), the newer two still due.
  insert into public.payables (shop_id, distributor_id, bill_id, amount_paise, due_date, paid_at, created_at)
  select p_shop, b.distributor_id, b.id, sum(bi.line_total_paise)::integer,
    b.billed_on + d.payment_terms_days,
    case b.bill_number
      when 'SB-2041' then (b.billed_on + d.payment_terms_days - 1)::timestamptz + interval '11 hours'
      when 'MT-118' then (b.billed_on + d.payment_terms_days + 2)::timestamptz + interval '11 hours'
    end,
    b.created_at
  from public.bills b
  join public.distributors d on d.id = b.distributor_id
  join public.bill_items bi on bi.bill_id = b.id
  where b.shop_id = p_shop
  group by b.id, b.distributor_id, b.billed_on, b.bill_number, b.created_at, d.payment_terms_days;

  -- This morning's reorder to Sri Balaji Agencies, which today's delivery is checked against.
  insert into public.purchase_orders (id, shop_id, distributor_id, status, created_at, sent_at)
  values ('00000000-0000-4000-8000-0000000000f1', p_shop, v_balaji, 'sent',
    v_today + interval '8 hours', v_today + interval '8 hours');
  insert into public.purchase_order_items (purchase_order_id, product_id, qty_ordered)
  select '00000000-0000-4000-8000-0000000000f1', p.id, x.qty
  from (values ('atta', 10), ('gold-winner-oil', 10), ('sugar', 10), ('toor-dal', 10), ('salt', 20))
    as x (code, qty)
  join public.products p on p.shop_id = p_shop and p.code = x.code;

  -- Lakshmi Raman's usual, every three days for the last three weeks.
  foreach v_day in array array[2, 5, 8, 11, 14, 17, 20] loop
    v_placed := v_today - make_interval(days => v_day) + interval '18 hours 30 minutes';
    insert into public.orders (shop_id, customer_id, status, payment_mode, lang, created_at, submitted_at)
    values (p_shop, '00000000-0000-4000-8000-0000000000c1', 'delivered', 'link', 'ta', v_placed, v_placed)
    returning id into v_order;
    insert into public.order_items (order_id, product_id, qty, unit_price_paise, price_source)
    select v_order, p.id, x.qty, p.price_paise, p.price_source
    from (values ('maggi', 2), ('aavin-milk', 2), ('bread', 1)) as x (code, qty)
    join public.products p on p.shop_id = p_shop and p.code = x.code;
  end loop;

  -- 90 days of everyday orders from the other regulars: two a day, one to three products each.
  select array_agg(code order by code) into v_codes from public.products where shop_id = p_shop;
  for v_day in 1..90 loop
    for v_slot in 1..2 loop
      v_placed := v_today - make_interval(days => v_day)
        + make_interval(hours => 9 + (v_day * 3 + v_slot * 5) % 11, mins => (v_day * 7) % 60);
      v_credit := (v_day + v_slot) % 5 = 0;
      insert into public.orders (shop_id, customer_id, status, payment_mode, lang, created_at, submitted_at)
      select p_shop, c.id, 'delivered', case when v_credit then 'credit' else 'link' end::public.payment_mode,
        c.lang, v_placed, v_placed
      from public.customers c
      where c.id = v_customers[1 + (v_day * 2 + v_slot) % array_length(v_customers, 1)]
      returning id into v_order;
      v_count := 1 + (v_day + v_slot) % 3;
      for v_k in 1..v_count loop
        insert into public.order_items (order_id, product_id, qty, unit_price_paise, price_source)
        select v_order, p.id, case when p.unit in ('kg', 'litre') then 1 else 1 + v_k % 2 end,
          p.price_paise, p.price_source
        from public.products p
        where p.shop_id = p_shop
          and p.code = v_codes[1 + (v_day * 7 + v_slot * 3 + v_k * 11) % array_length(v_codes, 1)]
        on conflict (order_id, product_id) do nothing;
      end loop;
    end loop;
  end loop;

  -- Seed history only; live orders get their totals from lib/orders.
  update public.orders o
  set total_paise = t.total
  from (
    select order_id, sum(round(qty * unit_price_paise))::integer as total
    from public.order_items
    group by order_id
  ) t
  where o.id = t.order_id and o.shop_id = p_shop and o.total_paise = 0;

  -- Paytm payments for the paid history, four minutes after each order.
  insert into public.payments (order_id, provider, provider_link_id, amount_paise, status, provider_txn_id, paid_at, created_at)
  select o.id, 'paytm', 'seed-history-' || o.number, o.total_paise, 'paid', 'seed-history-txn-' || o.number,
    o.submitted_at + interval '4 minutes', o.submitted_at
  from public.orders o
  where o.shop_id = p_shop and o.payment_mode = 'link' and o.status = 'delivered'
    and o.total_paise > 0
    and not exists (select 1 from public.payments pay where pay.order_id = o.id);

  -- History on account: each sale, and its repayment a week later (one in five ran late).
  -- Sales from the last week are still open, so the credit book has live entries.
  insert into public.credit_ledger (shop_id, customer_id, order_id, kind, amount_paise, created_at)
  select o.shop_id, o.customer_id, o.id, 'credit_sale', o.total_paise, o.submitted_at
  from public.orders o
  where o.shop_id = p_shop and o.payment_mode = 'credit' and o.status = 'delivered'
    and o.total_paise > 0
    and not exists (select 1 from public.credit_ledger c where c.order_id = o.id);
  insert into public.credit_ledger (shop_id, customer_id, order_id, kind, amount_paise, note, created_at)
  select c.shop_id, c.customer_id, null, 'repayment', -c.amount_paise, 'Paid at the counter',
    c.created_at + case when o.number % 5 = 0 then interval '18 days' else interval '7 days' end
  from public.credit_ledger c
  join public.orders o on o.id = c.order_id
  where c.shop_id = p_shop and c.kind = 'credit_sale'
    and o.customer_id <> '00000000-0000-4000-8000-0000000000c1'
    and c.created_at < v_today - interval '7 days'
    and c.created_at + case when o.number % 5 = 0 then interval '18 days' else interval '7 days' end < now();

  -- Ramesh Kumar's counter credit, said aloud by the owner (spec D1); ₹200 of it is still open.
  insert into public.credit_ledger (shop_id, customer_id, kind, amount_paise, note, created_at)
  values
    (p_shop, '00000000-0000-4000-8000-0000000000c9', 'credit_sale', 35000, 'Said at the counter', v_today - interval '4 days' + interval '19 hours'),
    (p_shop, '00000000-0000-4000-8000-0000000000c9', 'repayment', -15000, 'Paid at the counter', v_today - interval '1 day' + interval '10 hours');

  -- Weekly shelf counts for the products that run out fastest (spec B5).
  insert into public.shelf_counts (shop_id, product_id, counted_qty, counted_at)
  select p_shop, p.id, greatest(p.stock_qty + w.week * 3, 0), v_today - make_interval(days => w.week * 7) + interval '20 hours'
  from public.products p
  cross join generate_series(1, 4) as w (week)
  where p.shop_id = p_shop and p.code in ('sugar', 'gold-winner-oil', 'atta', 'maggi', 'aavin-milk');
end;
$$;

-- The reset now also clears the v2 tables, then loads the shop and its history again.
create or replace function public.reset_demo()
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.audit_log where true;
  delete from public.voice_turns where true;
  delete from public.credit_reminders where true;
  delete from public.delivery_checks where true;
  delete from public.payables where true;
  delete from public.purchase_order_items where true;
  delete from public.purchase_orders where true;
  delete from public.shelf_counts where true;
  delete from public.payments where true;
  delete from public.credit_ledger where true;
  update public.products set price_source = null where true;
  delete from public.order_items where true;
  delete from public.orders where true;
  delete from public.reorders where true;
  delete from public.bill_items where true;
  delete from public.bills where true;
  delete from public.distributors where true;
  delete from public.customers where true;
  delete from public.product_aliases where true;
  delete from public.products where true;
  delete from public.shops where true;
  perform public.seed_demo();
  perform public.seed_demo_history((select id from public.shops limit 1));
end;
$$;

revoke execute on function public.seed_demo_history(uuid) from public, anon, authenticated;
grant execute on function public.seed_demo_history(uuid) to service_role;
