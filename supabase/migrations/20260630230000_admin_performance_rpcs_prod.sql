-- RPCs de performance faltantes en prod (ventas stats + stock POS atómico).
-- Compatible con prod sin columna checkout_payment_method; status es enum order_status.

create or replace function public.admin_ventas_filter_stats(
  p_created_gte timestamptz default null,
  p_created_lt timestamptz default null,
  p_status text default 'all',
  p_payment text default 'all',
  p_q text default null
)
returns json
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_q text := nullif(trim(coalesce(p_q, '')), '');
  v_result json;
begin
  select json_build_object(
    'totalCents',
      coalesce(sum(
        case when o.status = 'paid'
          then greatest(0, coalesce(o.total_cents, 0))
          else 0 end
      ), 0),
    'cashCents',
      coalesce(sum(
        case when o.status = 'paid' and trim(coalesce(o.wompi_reference, '')) = 'POS:cash'
          then greatest(0, coalesce(o.total_cents, 0))
          else 0 end
      ), 0),
    'transferCents',
      coalesce(sum(
        case when o.status = 'paid'
          and trim(coalesce(o.wompi_reference, '')) = 'POS:transfer'
          then greatest(0, coalesce(o.total_cents, 0))
          else 0 end
      ), 0),
    'mixedCents',
      coalesce(sum(
        case when o.status = 'paid' and trim(coalesce(o.wompi_reference, '')) = 'POS:mixed'
          then greatest(0, coalesce(o.total_cents, 0))
          else 0 end
      ), 0),
    'otherCents',
      coalesce(sum(
        case when o.status = 'paid'
          and trim(coalesce(o.wompi_reference, '')) not in ('POS:cash', 'POS:transfer', 'POS:mixed')
          then greatest(0, coalesce(o.total_cents, 0))
          else 0 end
      ), 0),
    'paidCount',
      coalesce(count(*) filter (where o.status = 'paid'), 0)
  )
  into v_result
  from orders o
  where (p_created_gte is null or o.created_at >= p_created_gte)
    and (p_created_lt is null or o.created_at < p_created_lt)
    and (
      coalesce(p_status, 'all') = 'all'
      or o.status = p_status::public.order_status
    )
    and (
      coalesce(p_payment, 'all') = 'all'
      or (
        p_payment = 'cash'
        and trim(coalesce(o.wompi_reference, '')) = 'POS:cash'
      )
      or (
        p_payment = 'transfer'
        and trim(coalesce(o.wompi_reference, '')) = 'POS:transfer'
      )
      or (
        p_payment = 'mixed'
        and trim(coalesce(o.wompi_reference, '')) = 'POS:mixed'
      )
      or (
        p_payment = 'online'
        and trim(coalesce(o.wompi_reference, '')) not like 'POS:%'
      )
    )
    and (
      v_q is null
      or o.customer_name ilike '%' || v_q || '%'
      or coalesce(o.customer_email, '') ilike '%' || v_q || '%'
      or replace(o.id::text, '-', '') ilike '%' || replace(v_q, '-', '') || '%'
    );

  return coalesce(v_result, '{}'::json);
end;
$$;

grant execute on function public.admin_ventas_filter_stats(
  timestamptz, timestamptz, text, text, text
) to authenticated;

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
