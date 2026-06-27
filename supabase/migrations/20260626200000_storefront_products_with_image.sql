-- Tienda: solo productos publicados con imagen en listados y agregados.

create or replace function public.store_catalog_browse_preview(p_per_category int default 12)
returns table (
  category_id uuid,
  id uuid,
  name text,
  brand text,
  description text,
  price_cents integer,
  has_vat boolean,
  image_path text,
  stock_quantity integer,
  size_options jsonb,
  size_value numeric,
  size_unit text,
  fragrance_options text[],
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    ranked.category_id,
    ranked.id,
    ranked.name,
    ranked.brand,
    ranked.description,
    ranked.price_cents,
    ranked.has_vat,
    ranked.image_path,
    ranked.stock_quantity,
    ranked.size_options,
    ranked.size_value,
    ranked.size_unit,
    ranked.fragrance_options,
    ranked.created_at
  from (
    select
      p.category_id,
      p.id,
      p.name,
      p.brand,
      p.description,
      p.price_cents,
      p.has_vat,
      p.image_path,
      p.stock_quantity,
      p.size_options,
      p.size_value,
      p.size_unit,
      p.fragrance_options,
      p.created_at,
      row_number() over (
        partition by p.category_id
        order by p.created_at desc nulls last
      ) as rn
    from products p
    where p.is_published = true
      and p.image_path is not null
      and trim(p.image_path) <> ''
  ) ranked
  where ranked.rn <= greatest(1, coalesce(p_per_category, 12));
$$;

create or replace function public.store_published_product_counts_by_category()
returns table (category_id uuid, product_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select p.category_id, count(*)::bigint as product_count
  from products p
  where p.is_published = true
    and p.category_id is not null
    and p.image_path is not null
    and trim(p.image_path) <> ''
  group by p.category_id;
$$;

create or replace function public.store_listing_facets_agg(p_category_ids uuid[] default null)
returns json
language sql
stable
security invoker
set search_path = public
as $$
  with base as (
    select
      p.brand,
      p.colors,
      p.size_options,
      p.size_value,
      p.size_unit,
      p.price_cents
    from products p
    where p.is_published = true
      and p.image_path is not null
      and trim(p.image_path) <> ''
      and (
        p_category_ids is null
        or cardinality(p_category_ids) = 0
        or p.category_id = any (p_category_ids)
      )
  ),
  brands as (
    select coalesce(
      json_agg(distinct b order by b),
      '[]'::json
    ) as arr
    from (
      select trim(brand) as b
      from base
      where brand is not null
        and trim(brand) <> ''
        and char_length(trim(brand)) <= 160
    ) t
  ),
  colors as (
    select coalesce(
      json_agg(distinct c order by c),
      '[]'::json
    ) as arr
    from (
      select trim(c) as c
      from base, unnest(coalesce(colors, '{}'::text[])) as c
      where c is not null
        and trim(c) <> ''
        and char_length(trim(c)) <= 64
    ) t
  ),
  sizes as (
    select coalesce(
      json_agg(row order by row->>'size_value', row->>'size_unit'),
      '[]'::json
    ) as arr
    from (
      select distinct jsonb_build_object(
        'size_value', size_value,
        'size_unit', size_unit,
        'size_options', size_options
      ) as row
      from base
      where size_value is not null
         or size_unit is not null
         or size_options is not null
    ) t
  ),
  prices as (
    select
      coalesce(min(greatest(0, floor(price_cents::numeric))), 0)::bigint as price_min,
      coalesce(max(greatest(0, floor(price_cents::numeric))), 0)::bigint as price_max
    from base
    where price_cents is not null
      and price_cents > 0
  )
  select json_build_object(
    'brands', (select arr from brands),
    'colors', (select arr from colors),
    'sizeRows', (select arr from sizes),
    'priceMin', (select price_min from prices),
    'priceMax', (select price_max from prices)
  );
$$;
