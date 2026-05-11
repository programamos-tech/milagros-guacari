-- Precios promocionales en la tienda: % por producto sin exponer códigos ni filas de cupón al anon.

create or replace function public.storefront_coupon_discounts()
returns table (product_id uuid, discount_percent integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.product_id,
    max(c.discount_percent)::integer as discount_percent
  from store_coupon_products l
  inner join store_coupons c on c.id = l.coupon_id
  where c.is_enabled
    and (c.starts_at is null or c.starts_at <= now())
    and (c.ends_at is null or c.ends_at >= now())
    and c.discount_percent > 0
  group by l.product_id;
$$;

create or replace function public.storefront_coupon_discount_for_product(p_product_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(c.discount_percent), 0)::integer
  from store_coupon_products l
  inner join store_coupons c on c.id = l.coupon_id
  where l.product_id = p_product_id
    and c.is_enabled
    and (c.starts_at is null or c.starts_at <= now())
    and (c.ends_at is null or c.ends_at >= now())
    and c.discount_percent > 0;
$$;

grant execute on function public.storefront_coupon_discounts() to anon, authenticated;
grant execute on function public.storefront_coupon_discount_for_product(uuid) to anon, authenticated;
