-- The demo shop for spec v4.1 (section 17, step 2), loaded after seed_demo() by reset_demo().
-- Everything is placed relative to now and nothing is random, so every reset tells the same story:
-- a normal week is fine, this week is short because the Deepavali order's bill is due, the three
-- late payers would close only part of the gap, and the loan needed is in Mudra's Shishu band.
-- History goes back to the start of the third full month, so the statement has three months.
create function public.seed_demo_rotation(p_shop uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_start date := (date_trunc('month', now() at time zone 'Asia/Kolkata') - interval '3 months')::date;
  v_balaji uuid;
  v_murugan uuid;
  v_order uuid;
  v_bill uuid;
  v_day date;
  v_k integer;
  v_total integer;
  v_due date;
  v_entry record;
  v_paid_at timestamptz;
  v_payment uuid;
  v_n integer := 0;
begin
  update public.customers c set lang = x.lang
  from (values
    ('00000000-0000-4000-8000-0000000000c1', 'ta'), ('00000000-0000-4000-8000-0000000000c2', 'hi'),
    ('00000000-0000-4000-8000-0000000000c3', 'ta'), ('00000000-0000-4000-8000-0000000000c4', 'kn')
  ) as x (id, lang)
  where c.id = x.id::uuid;
  insert into public.customers (id, shop_id, name, phone, lang)
  values
    ('00000000-0000-4000-8000-0000000000c5', p_shop, 'Priya Natarajan', '+910000000015', 'ta'),
    ('00000000-0000-4000-8000-0000000000c6', p_shop, 'Imran Khan', '+910000000016', 'hi'),
    ('00000000-0000-4000-8000-0000000000c7', p_shop, 'Divya Shetty', '+910000000017', 'kn'),
    ('00000000-0000-4000-8000-0000000000c8', p_shop, 'Karthik Subramanian', '+910000000018', 'en'),
    ('00000000-0000-4000-8000-0000000000c9', p_shop, 'Ramesh Kumar', '+910000000019', 'ta');

  -- Setup said once by voice (B7) and what the loan-ready check needs (section 10).
  insert into public.shop_profile (shop_id, udyam_status, has_pan, has_gst, repaid_tarun_before)
  values (p_shop, 'no', true, false, false);
  insert into public.shop_costs (shop_id, kind, amount_paise, period)
  values
    (p_shop, 'rent', 1300000, 'month'), (p_shop, 'staff', 300000, 'week'),
    (p_shop, 'home', 350000, 'week'), (p_shop, 'cash_purchases', 200000, 'week');

  insert into public.distributors (shop_id, name, phone, payment_terms_days)
  values (p_shop, 'Sri Balaji Agencies', '+910000000002', 15)
  returning id into v_balaji;
  insert into public.distributors (shop_id, name, phone, payment_terms_days)
  values (p_shop, 'Murugan Traders', '+910000000003', 7)
  returning id into v_murugan;

  -- The Deepavali order, approved two weeks ago and delivered with its bill 11 days ago.
  insert into public.purchase_orders (shop_id, distributor_id, status, festival, approved_at, created_at, sent_at)
  values (
    p_shop, v_balaji, 'delivered', 'Deepavali',
    ((v_today - 13) + time '18:00') at time zone 'Asia/Kolkata',
    ((v_today - 13) + time '18:00') at time zone 'Asia/Kolkata',
    ((v_today - 13) + time '18:05') at time zone 'Asia/Kolkata'
  )
  returning id into v_order;
  insert into public.purchase_order_items (purchase_order_id, product_id, qty_ordered)
  select v_order, p.id, x.qty
  from (values
    ('gold-winner-oil', 50), ('fortune-oil', 20), ('sugar', 101), ('atta', 30), ('toor-dal', 40),
    ('rava', 50), ('moong-dal', 25), ('urad-dal', 25), ('ponni-rice', 100), ('jaggery', 30),
    ('tea', 20), ('chilli-powder', 20), ('sambar-powder', 20), ('turmeric', 19), ('idli-rice', 40)
  ) as x (code, qty)
  join public.products p on p.shop_id = p_shop and p.code = x.code;

  -- Sri Balaji delivers staples every week on 15 days' credit, at 86% of the printed price. The
  -- delivery 11 days ago was the Deepavali order. Unpaid now: the last regular bill, the
  -- Deepavali bill (due in 4 days) and the one before them, 3 days overdue. Older bills were
  -- paid from the bank, one in five two days late.
  for v_k in 0..20 loop
    v_day := v_today - 4 - 7 * v_k;
    exit when v_day < v_start;
    insert into public.bills (shop_id, distributor_id, bill_number, billed_on, status, created_at, purchase_order_id)
    values (
      p_shop, v_balaji, case when v_k = 1 then 'DV-1' else 'SB-' || (2072 - v_k) end, v_day, 'confirmed',
      (v_day + time '10:00') at time zone 'Asia/Kolkata', case when v_k = 1 then v_order end
    )
    returning id into v_bill;
    insert into public.bill_items (bill_id, product_id, qty, unit_cost_paise, mrp_paise, line_total_paise, created_at)
    select v_bill, p.id, x.qty, round(p.price_paise * 0.86 / 100) * 100, p.price_paise,
      x.qty * round(p.price_paise * 0.86 / 100) * 100, (v_day + time '10:00') at time zone 'Asia/Kolkata'
    from (
      select poi.qty_ordered as qty, pr.code from public.purchase_order_items poi
      join public.products pr on pr.id = poi.product_id
      where v_k = 1 and poi.purchase_order_id = v_order
      union all
      select w.qty, w.code from (values
        ('ponni-rice', 100), ('idli-rice', 30), ('toor-dal', 20), ('moong-dal', 6), ('urad-dal', 8),
        ('sugar', 44), ('jaggery', 8), ('atta', 10), ('rava', 12), ('salt', 37), ('gold-winner-oil', 16),
        ('fortune-oil', 4), ('sambar-powder', 8), ('chilli-powder', 8), ('turmeric', 6), ('tea', 6)
      ) as w (code, qty)
      where v_k <> 1
      union all
      -- Gingelly oil is bought now and then, which gives it a re-buy rate but no weekly line.
      select 6, 'gingelly-oil' where v_k in (5, 7)
    ) as x (qty, code)
    join public.products p on p.shop_id = p_shop and p.code = x.code;
    select sum(line_total_paise)::integer into v_total from public.bill_items where bill_id = v_bill;
    v_due := v_day + 15;
    insert into public.payables (shop_id, distributor_id, bill_id, amount_paise, due_date, paid_at, paid_via, created_at)
    values (
      p_shop, v_balaji, v_bill, v_total, v_due,
      case when v_k <= 2 then null
        else ((v_due + case when v_k % 5 = 0 then 2 else 0 end) + time '11:00') at time zone 'Asia/Kolkata' end,
      case when v_k <= 2 then null else 'bank' end,
      (v_day + time '10:00') at time zone 'Asia/Kolkata'
    );
  end loop;

  -- Murugan Traders brings dairy and packaged goods every week on 7 days' credit, at 84%. Only
  -- the last bill is unpaid; older ones were paid in cash, one in four three days late.
  for v_k in 0..20 loop
    v_day := v_today - 5 - 7 * v_k;
    exit when v_day < v_start;
    insert into public.bills (shop_id, distributor_id, bill_number, billed_on, status, created_at)
    values (p_shop, v_murugan, 'MT-' || (140 - v_k), v_day, 'confirmed', (v_day + time '09:00') at time zone 'Asia/Kolkata')
    returning id into v_bill;
    insert into public.bill_items (bill_id, product_id, qty, unit_cost_paise, mrp_paise, line_total_paise, created_at)
    select v_bill, p.id, x.qty, round(p.price_paise * 0.84 / 100) * 100, p.price_paise,
      x.qty * round(p.price_paise * 0.84 / 100) * 100, (v_day + time '09:00') at time zone 'Asia/Kolkata'
    from (
      select w.qty, w.code from (values
        ('aavin-milk', 85), ('arokya-milk', 30), ('butter', 14), ('curd', 30), ('ghee', 4), ('eggs', 119),
        ('bread', 20), ('batter', 24), ('maggi', 61), ('biscuits', 80), ('coke', 18), ('water', 36),
        ('toothpaste', 6), ('soap', 16), ('dishwash', 14), ('matchbox', 20), ('onion', 45),
        ('tomato', 35), ('coconut', 24)
      ) as w (code, qty)
      union all
      select 5, 'coconut-oil' where v_k in (4, 6)
      union all
      -- Detergent last came more than 8 weeks ago: counted twice since, never sold.
      select 8, 'detergent' where v_k in (8, 10)
    ) as x (qty, code)
    join public.products p on p.shop_id = p_shop and p.code = x.code;
    select sum(line_total_paise)::integer into v_total from public.bill_items where bill_id = v_bill;
    v_due := v_day + 7;
    insert into public.payables (shop_id, distributor_id, bill_id, amount_paise, due_date, paid_at, paid_via, created_at)
    values (
      p_shop, v_murugan, v_bill, v_total, v_due,
      case when v_k = 0 then null
        else ((v_due + case when v_k % 4 = 0 then 3 else 0 end) + time '18:00') at time zone 'Asia/Kolkata' end,
      case when v_k = 0 then null else 'cash' end,
      (v_day + time '09:00') at time zone 'Asia/Kolkata'
    );
  end loop;

  -- Each price points at the latest bill line that printed it (spec rule 5).
  update public.products p
  set price_source = latest.id
  from (
    select distinct on (bi.product_id) bi.product_id, bi.id
    from public.bill_items bi
    join public.bills b on b.id = bi.bill_id
    where b.shop_id = p_shop
    order by bi.product_id, bi.created_at desc
  ) latest
  where p.id = latest.product_id;

  -- Shelf counts for the top 20 by money (C1): most counted two weeks and one week ago, a few only
  -- last week. The second count follows from the first, what the bills brought in between and the
  -- week's sales, so the counts and the bills agree. The same counts open the history, so the
  -- money cycle has a first week to compare with.
  insert into public.shelf_counts (shop_id, product_id, counted_qty, counted_at)
  select p_shop, p.id, x.first_count, (w.day + time '20:00') at time zone 'Asia/Kolkata'
  from (values
    ('ponni-rice', 100, 350), ('sugar', 44, 110), ('atta', 12, 30), ('gold-winner-oil', 20, 50),
    ('toor-dal', 20, 50), ('idli-rice', 30, 100), ('urad-dal', 8, 45), ('moong-dal', 6, 35),
    ('rava', 12, 60), ('jaggery', 8, 40), ('tea', 6, 30), ('fortune-oil', 4, 30), ('butter', 14, 40),
    ('toothpaste', 6, 18), ('maggi', 61, 150), ('soap', 16, 45), ('detergent', 0, 12)
  ) as x (code, weekly, first_count)
  join public.products p on p.shop_id = p_shop and p.code = x.code
  cross join (values (v_today - 14), (v_start + 7)) as w (day);
  insert into public.shelf_counts (shop_id, product_id, counted_qty, counted_at)
  select p_shop, p.id,
    greatest(x.first_count + coalesce(r.received, 0) - x.weekly, 0),
    (w.day + time '20:00') at time zone 'Asia/Kolkata'
  from (values
    ('ponni-rice', 100, 350), ('sugar', 44, 110), ('atta', 12, 30), ('gold-winner-oil', 20, 50),
    ('toor-dal', 20, 50), ('idli-rice', 30, 100), ('urad-dal', 8, 45), ('moong-dal', 6, 35),
    ('rava', 12, 60), ('jaggery', 8, 40), ('tea', 6, 30), ('fortune-oil', 4, 30), ('butter', 14, 40),
    ('toothpaste', 6, 18), ('maggi', 61, 150), ('soap', 16, 45), ('detergent', 0, 12)
  ) as x (code, weekly, first_count)
  join public.products p on p.shop_id = p_shop and p.code = x.code
  cross join (values (v_today - 7, v_today - 14), (v_start + 14, v_start + 7)) as w (day, previous)
  left join lateral (
    select sum(bi.qty) as received
    from public.bill_items bi
    join public.bills b on b.id = bi.bill_id
    where bi.product_id = p.id and b.status = 'confirmed'
      and bi.created_at > (w.previous + time '20:00') at time zone 'Asia/Kolkata'
      and bi.created_at <= (w.day + time '20:00') at time zone 'Asia/Kolkata'
  ) r on true;
  insert into public.shelf_counts (shop_id, product_id, counted_qty, counted_at)
  select p_shop, p.id, x.counted, ((v_today - 7) + time '20:00') at time zone 'Asia/Kolkata'
  from (values ('ghee', 40), ('gingelly-oil', 24), ('coconut-oil', 16)) as x (code, counted)
  join public.products p on p.shop_id = p_shop and p.code = x.code;

  -- Sales: ₹5,000 in cash said every night, and ₹2,000 a day through Paytm. The money in hand
  -- said last night is ₹7,200.
  insert into public.day_close (shop_id, business_date, cash_sales_paise, money_in_hand_paise, recorded_at)
  select p_shop, g.day::date, 500000,
    case when g.day::date = v_today - 1 then 720000
      else 600000 + ((g.day::date - v_start) * 37 % 9) * 100000 end,
    (g.day::date + time '21:30') at time zone 'Asia/Kolkata'
  from generate_series(v_start::timestamp, (v_today - 1)::timestamp, interval '1 day') as g (day);
  insert into public.payments (shop_id, provider, amount_paise, status, provider_txn_id, paid_at, created_at)
  select p_shop, 'paytm', s.amount, 'paid',
    'seed-sale-' || to_char(g.day, 'YYYYMMDD') || '-' || s.n,
    (g.day::date + s.at) at time zone 'Asia/Kolkata', (g.day::date + s.at) at time zone 'Asia/Kolkata'
  from generate_series(v_start::timestamp, (v_today - 1)::timestamp, interval '1 day') as g (day)
  cross join (values
    (1, 23000, time '10:15'), (2, 56000, time '13:40'), (3, 34000, time '17:05'), (4, 87000, time '19:50')
  ) as s (n, amount, at);

  -- Credit, as the owner said it at the counter, and how each regular repays: Arjun usually in 12
  -- days, Meena in 7 and Rahul in 5, and all three are late now; Priya and Karthik are due this
  -- week; Lakshmi later; Imran and Divya have no pattern yet; Ramesh owes nothing. Some repaid
  -- through a payment link, which Paytm verified.
  for v_entry in
    select * from (values
      ('c4', 90, 3100, 11, false), ('c4', 65, 2800, 12, false), ('c4', 42, 3500, 13, true), ('c4', 21, 4200, null, false),
      ('c3', 80, 1800, 6, false), ('c3', 60, 2100, 7, true), ('c3', 40, 1900, 8, false), ('c3', 15, 3000, null, false),
      ('c2', 75, 1500, 4, false), ('c2', 55, 1700, 5, false), ('c2', 35, 1600, 6, true), ('c2', 9, 2400, null, false),
      ('c5', 95, 1200, 9, false), ('c5', 70, 1400, 10, true), ('c5', 45, 1300, 11, false), ('c5', 4, 1600, null, false),
      ('c8', 85, 1000, 7, false), ('c8', 60, 900, 7, false), ('c8', 30, 1100, 8, true), ('c8', 3, 1200, null, false),
      ('c1', 100, 800, 13, false), ('c1', 75, 950, 14, false), ('c1', 50, 850, 15, false), ('c1', 2, 900, null, false),
      ('c6', 40, 600, 8, false), ('c6', 6, 700, null, false),
      ('c7', 1, 500, null, false),
      ('c9', 50, 300, 5, false), ('c9', 35, 250, 6, false), ('c9', 20, 400, 7, false)
    ) as x (customer, sale_days, rupees, repay_after, by_link)
  loop
    insert into public.credit_ledger (shop_id, customer_id, kind, amount_paise, note, source, created_at)
    values (
      p_shop, ('00000000-0000-4000-8000-0000000000' || v_entry.customer)::uuid, 'credit_sale',
      v_entry.rupees * 100, 'Said at the counter', 'owner_said',
      ((v_today - v_entry.sale_days) + time '18:30') at time zone 'Asia/Kolkata'
    );
    continue when v_entry.repay_after is null;
    v_paid_at := ((v_today - v_entry.sale_days + v_entry.repay_after) + time '11:00') at time zone 'Asia/Kolkata';
    if v_entry.by_link then
      v_n := v_n + 1;
      insert into public.payments (
        shop_id, customer_id, provider, amount_paise, status, provider_txn_id, paid_at, created_at,
        is_credit_repayment
      )
      values (
        p_shop, ('00000000-0000-4000-8000-0000000000' || v_entry.customer)::uuid, 'paytm',
        v_entry.rupees * 100, 'paid', 'seed-credit-' || v_n, v_paid_at, v_paid_at - interval '1 day', true
      )
      returning id into v_payment;
      insert into public.credit_ledger (shop_id, customer_id, kind, amount_paise, note, source, payment_id, created_at)
      values (
        p_shop, ('00000000-0000-4000-8000-0000000000' || v_entry.customer)::uuid, 'repayment',
        -v_entry.rupees * 100, 'Paid by link', 'verified_payment', v_payment, v_paid_at
      );
    else
      insert into public.credit_ledger (shop_id, customer_id, kind, amount_paise, note, source, created_at)
      values (
        p_shop, ('00000000-0000-4000-8000-0000000000' || v_entry.customer)::uuid, 'repayment',
        -v_entry.rupees * 100, 'Paid at the counter', 'owner_said', v_paid_at
      );
    end if;
  end loop;
end;
$$;

-- The reset clears every table, loads the shop and catalogue with seed_demo(), drops the v1 orders
-- that function makes (customer ordering is frozen and has no part in the v4 story), and loads
-- the v4 history.
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
end;
$$;

revoke execute on function public.seed_demo_rotation(uuid) from public, anon, authenticated;
grant execute on function public.seed_demo_rotation(uuid) to service_role;
revoke execute on function public.reset_demo() from public, anon, authenticated;
grant execute on function public.reset_demo() to service_role;
