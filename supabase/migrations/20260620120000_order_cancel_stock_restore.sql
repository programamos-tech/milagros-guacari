-- Registro de stock descontado por línea y devolución al anular factura pagada.

alter table public.order_items
  add column if not exists stock_deducted_local integer not null default 0
    check (stock_deducted_local >= 0);

alter table public.order_items
  add column if not exists stock_deducted_warehouse integer not null default 0
    check (stock_deducted_warehouse >= 0);

alter table public.orders
  add column if not exists stock_restored_at timestamptz;

comment on column public.order_items.stock_deducted_local is
  'Unidades descontadas de stock_local al confirmar pago/venta.';
comment on column public.order_items.stock_deducted_warehouse is
  'Unidades descontadas de stock_warehouse al confirmar pago (web/Wompi).';
comment on column public.orders.stock_restored_at is
  'Marca de tiempo si el inventario de la venta ya fue devuelto (anulación).';

create or replace function public.restore_order_items_stock(p_order_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  o record;
  it record;
  loc int;
  wh int;
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
      oi.stock_deducted_warehouse
    from public.order_items oi
    where oi.order_id = p_order_id
      and oi.product_id is not null
  loop
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

comment on function public.restore_order_items_stock(uuid) is
  'Devuelve inventario de líneas de un pedido pagado (idempotente vía stock_restored_at).';

grant execute on function public.restore_order_items_stock(uuid) to authenticated;
