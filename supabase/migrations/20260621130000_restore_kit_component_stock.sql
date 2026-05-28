-- Restaurar stock de componentes cuando la línea de pedido es un kit.

create or replace function public.restore_order_items_stock(p_order_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  o record;
  it record;
  comp jsonb;
  loc int;
  wh int;
  pid uuid;
begin
  if not public.user_has_admin_profile() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select status, wompi_reference, stock_restored_at
  into o
  from public.orders
  where id = p_order_id;

  if not found then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;

  if o.stock_restored_at is not null then
    return;
  end if;

  if o.status is distinct from 'paid' then
    return;
  end if;

  for it in
    select
      oi.product_id,
      oi.quantity,
      oi.stock_deducted_local,
      oi.stock_deducted_warehouse,
      oi.kit_id,
      oi.kit_component_deductions
    from public.order_items oi
    where oi.order_id = p_order_id
  loop
    if it.kit_id is not null and it.kit_component_deductions is not null then
      for comp in
        select * from jsonb_array_elements(it.kit_component_deductions)
      loop
        pid := (comp->>'product_id')::uuid;
        loc := coalesce((comp->>'stock_deducted_local')::int, 0);
        wh := coalesce((comp->>'stock_deducted_warehouse')::int, 0);
        if pid is null or (loc = 0 and wh = 0) then
          continue;
        end if;
        update public.products p
        set
          stock_local = p.stock_local + loc,
          stock_warehouse = p.stock_warehouse + wh
        where p.id = pid;
      end loop;
      continue;
    end if;

    if it.product_id is null then
      continue;
    end if;

    loc := coalesce(it.stock_deducted_local, 0);
    wh := coalesce(it.stock_deducted_warehouse, 0);

    if loc = 0 and wh = 0 then
      if coalesce(o.wompi_reference, '') like 'POS:%' then
        loc := greatest(0, coalesce(it.quantity, 0));
      else
        continue;
      end if;
    end if;

    if loc = 0 and wh = 0 then
      continue;
    end if;

    update public.products p
    set
      stock_local = p.stock_local + loc,
      stock_warehouse = p.stock_warehouse + wh
    where p.id = it.product_id;
  end loop;

  update public.orders
  set stock_restored_at = now()
  where id = p_order_id;
end;
$$;
