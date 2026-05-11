-- Idempotente: alinea columnas que el seed (`seed-produtos-xlsx.mjs`) y la app esperan.
-- Ejecutar contra producción solo si `db push` no puede (historial de migraciones desincronizado).

alter table public.products
  add column if not exists category_id uuid references public.categories (id) on delete set null;

alter table public.products
  add column if not exists stock_warehouse integer not null default 0;

alter table public.products
  add column if not exists stock_local integer not null default 0;

alter table public.products
  add column if not exists reference text not null default '';

alter table public.products
  add column if not exists brand text not null default '';

alter table public.products
  add column if not exists cost_cents integer not null default 0;

alter table public.products
  add column if not exists size_value numeric(10, 2);

alter table public.products
  add column if not exists size_unit text;

alter table public.products
  add column if not exists colors text[] not null default '{}'::text[];

alter table public.products
  add column if not exists fragrance_options text[] not null default '{}'::text[];

alter table public.products
  add column if not exists fragrance_option_images jsonb not null default '{}'::jsonb;
