-- Consultas frecuentes: ventas/reportes por fecha, catálogo publicado.

create index if not exists orders_created_at_desc_idx
  on public.orders (created_at desc);

create index if not exists orders_status_created_at_desc_idx
  on public.orders (status, created_at desc);

create index if not exists products_published_created_at_desc_idx
  on public.products (created_at desc)
  where is_published = true;

create index if not exists products_published_category_created_at_desc_idx
  on public.products (category_id, created_at desc)
  where is_published = true;
