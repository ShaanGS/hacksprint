-- Confirming a delivery bill, in one transaction (spec B1, B4, C1). The owner-checked lines go in
-- as bill lines; stock goes up; each product's price follows the printed MRP and remembers which
-- bill line set it (spec rule 6); the shop now owes the distributor; and the delivery is checked
-- against the open purchase order. A price rise compares each line's cost with the same
-- distributor's last bill: it is that distributor who raised it. Returns the issues for the
-- owner: missing, qty_mismatch and price_up.
create function public.confirm_bill(p_bill_id uuid, p_distributor_id uuid, p_lines jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_bill public.bills%rowtype;
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
  -- Only a parsed bill can be confirmed, so a double tap does nothing the second time. The owner
  -- may have picked the distributor when the photo did not name one we know.
  update public.bills set status = 'confirmed', distributor_id = p_distributor_id
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

  if v_bill.distributor_id is not null then
    select d.payment_terms_days into v_terms from public.distributors d where d.id = v_bill.distributor_id;
    if v_total > 0 then
      insert into public.payables (shop_id, distributor_id, bill_id, amount_paise, due_date)
      values (
        v_bill.shop_id, v_bill.distributor_id, p_bill_id, v_total,
        coalesce(v_bill.billed_on, current_date) + coalesce(v_terms, 15)
      );
    end if;

    -- The delivery answers the latest order sent to this distributor.
    select po.id into v_order_id
    from public.purchase_orders po
    where po.distributor_id = v_bill.distributor_id and po.status = 'sent'
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

-- The owner's home numbers (spec E1) in one round trip. "Saved" orders are the ones the voice
-- page took today: submitted since the start of the shop's day and not rejected.
create function public.home_numbers(p_shop_id uuid, p_since timestamptz)
returns table (
  orders_count integer,
  orders_paise bigint,
  collected_paise bigint,
  owed_to_shop_paise bigint,
  owed_by_shop_paise bigint
)
language sql
stable
set search_path = ''
as $$
  select
    (select count(*)::integer from public.orders o
      where o.shop_id = p_shop_id and o.submitted_at >= p_since
        and o.status not in ('draft', 'rejected')),
    (select coalesce(sum(o.total_paise), 0) from public.orders o
      where o.shop_id = p_shop_id and o.submitted_at >= p_since
        and o.status not in ('draft', 'rejected')),
    (select coalesce(sum(pay.amount_paise), 0) from public.payments pay
      join public.orders o on o.id = pay.order_id
      where o.shop_id = p_shop_id and pay.status = 'paid' and pay.paid_at >= p_since),
    (select coalesce(sum(c.amount_paise), 0) from public.credit_ledger c
      where c.shop_id = p_shop_id),
    (select coalesce(sum(p.amount_paise), 0) from public.payables p
      where p.shop_id = p_shop_id and p.paid_at is null);
$$;

revoke execute on function public.confirm_bill(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.confirm_bill(uuid, uuid, jsonb) to service_role;
revoke execute on function public.home_numbers(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.home_numbers(uuid, timestamptz) to service_role;
