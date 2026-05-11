-- Presentaciones múltiples por producto (ej. 177 ml y 400 ml).
alter table public.products
  add column if not exists size_options jsonb not null default '[]'::jsonb;

comment on column public.products.size_options is
  'JSON array: [{"value":177,"unit":"ml"},…]. Vacío → usar solo size_value/size_unit. La primera entrada se sincroniza en esas columnas al guardar.';

update public.products
set size_options = jsonb_build_array(
  jsonb_build_object(
    'value', size_value::numeric,
    'unit', lower(coalesce(nullif(trim(size_unit), ''), 'unidad'))
  )
)
where coalesce(jsonb_array_length(size_options), 0) = 0
  and size_value is not null
  and size_value > 0;
