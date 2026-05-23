-- Descuenta stock_local en una sola transacción (POS): menos round-trips y bloqueo atómico por producto.

create or replace function public.decrement_products_stock_local(p_items jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  r record;
begin
  if not public.user_has_admin_profile() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) = 0
  then
    raise exception 'invalid_items' using errcode = '22023';
  end if;

  for r in
    select
      (elem->>'product_id')::uuid as product_id,
      sum(greatest(1, floor((elem->>'quantity')::numeric))::int)::int as quantity
    from jsonb_array_elements(p_items) as elem
    where elem ? 'product_id'
      and elem ? 'quantity'
    group by 1
    order by 1
  loop
    if r.quantity is null or r.quantity <= 0 then
      raise exception 'invalid_quantity' using errcode = '22023';
    end if;

    update public.products p
    set stock_local = p.stock_local - r.quantity
    where p.id = r.product_id
      and p.stock_local >= r.quantity;

    if not found then
      raise exception 'insufficient_stock'
        using errcode = 'P0001', detail = r.product_id::text;
    end if;
  end loop;
end;
$$;

comment on function public.decrement_products_stock_local(jsonb) is
  'Descuenta stock_local para ítems POS [{product_id, quantity}, ...]; falla si falta stock o no es admin.';

grant execute on function public.decrement_products_stock_local(jsonb) to authenticated;
