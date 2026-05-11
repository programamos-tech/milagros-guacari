-- Opciones de fragancia / tono por producto (varias por fila, como colores).
alter table public.products
  add column if not exists fragrance_options text[] not null default '{}'::text[];
