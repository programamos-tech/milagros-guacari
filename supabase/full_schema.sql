-- =============================================================================
-- TIENDAS — esquema completo (plantilla)
--
-- Usa este archivo en Supabase → SQL Editor si empiezas un proyecto NUEVO y no
-- tienes aún las tablas public.products, public.orders, etc.
--
-- Si el proyecto YA tiene parte del esquema, NO ejecutes todo: en su lugar
-- aplica en orden los archivos en supabase/migrations/ (o supabase db push).
-- =============================================================================

-- --- 20260505190000_init.sql ---
-- Tiendas template: schema + RLS + Storage (one Supabase project per store fork)

-- Products
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'COP',
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  image_path text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Admin profiles (link Auth users to admin role; insert first row via SQL after creating user)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'admin' check (role = 'admin'),
  created_at timestamptz not null default now()
);

create type public.order_status as enum ('pending', 'paid', 'failed', 'cancelled');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  status public.order_status not null default 'pending',
  customer_email text not null,
  customer_name text not null,
  total_cents integer not null check (total_cents >= 0),
  currency text not null default 'COP',
  wompi_payment_link_id text,
  wompi_transaction_id text,
  wompi_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  product_name_snapshot text not null
);

create index order_items_order_id_idx on public.order_items (order_id);
create index orders_status_idx on public.orders (status);
create index orders_wompi_payment_link_id_idx on public.orders (wompi_payment_link_id);

-- updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

-- RLS
alter table public.products enable row level security;
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Profiles: admins read own row (used by middleware)
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

-- Products: catalog
create policy "products_select_published"
on public.products
for select
to anon, authenticated
using (is_published = true);

create policy "products_select_admin_all"
on public.products
for select
to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid())
);

create policy "products_insert_admin"
on public.products
for insert
to authenticated
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid())
);

create policy "products_update_admin"
on public.products
for update
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()))
with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

create policy "products_delete_admin"
on public.products
for delete
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));

-- Orders / items: admin read only (writes via service role)
create policy "orders_select_admin"
on public.orders
for select
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));

create policy "order_items_select_admin"
on public.order_items
for select
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));

-- Storage: product images
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product_images_public_read"
on storage.objects
for select
to public
using (bucket_id = 'product-images');

create policy "product_images_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and exists (select 1 from public.profiles p where p.id = auth.uid())
);

create policy "product_images_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-images'
  and exists (select 1 from public.profiles p where p.id = auth.uid())
)
with check (
  bucket_id = 'product-images'
  and exists (select 1 from public.profiles p where p.id = auth.uid())
);

create policy "product_images_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-images'
  and exists (select 1 from public.profiles p where p.id = auth.uid())
);

-- --- 20260506120000_orders_shipping.sql ---
-- Optional shipping / contact fields captured at checkout
alter table public.orders
  add column if not exists shipping_phone text,
  add column if not exists shipping_address text,
  add column if not exists shipping_city text,
  add column if not exists shipping_postal_code text;

-- --- 20260507120000_categories.sql ---
-- Categories for catalog organization + optional FK on products
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index categories_sort_order_idx on public.categories (sort_order, name);

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

alter table public.products
  add column category_id uuid references public.categories (id) on delete set null;

create index products_category_id_idx on public.products (category_id);

alter table public.categories enable row level security;

-- Vitrina: lectura de categorías para filtros / futuro menú
create policy "categories_select_public"
on public.categories
for select
to anon, authenticated
using (true);

create policy "categories_insert_admin"
on public.categories
for insert
to authenticated
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid())
);

create policy "categories_update_admin"
on public.categories
for update
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()))
with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

create policy "categories_delete_admin"
on public.categories
for delete
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));

-- --- 20260608120000_category_listing_hero.sql ---
alter table public.categories
  add column if not exists listing_hero_image_path text,
  add column if not exists listing_hero_alt_text text;

-- --- 20260508130000_product_stock_split.sql ---
-- Inventario: bodega + local. Total = stock_warehouse + stock_local (columna generada stock_quantity).
alter table public.products
  add column if not exists stock_warehouse integer not null default 0
    check (stock_warehouse >= 0);

alter table public.products
  add column if not exists stock_local integer not null default 0
    check (stock_local >= 0);

do $$
begin
  if exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'products'
      and c.column_name = 'stock_quantity'
      and c.is_generated = 'NEVER'
  ) then
    update public.products
    set
      stock_local = greatest(0, coalesce(stock_quantity, 0)),
      stock_warehouse = 0;

    alter table public.products drop column stock_quantity;

    alter table public.products
      add column stock_quantity integer
      generated always as (stock_warehouse + stock_local) stored;
  end if;
end $$;

-- --- 20260510120000_product_reference_brand_cost.sql ---
-- Referencia interna, marca y costo de compra (opcional en UI; defaults seguros).
alter table public.products
  add column if not exists reference text not null default '';

alter table public.products
  add column if not exists brand text not null default '';

alter table public.products
  add column if not exists cost_cents integer not null default 0
    check (cost_cents >= 0);

-- --- 20260616120000_products_cost_gross_cents.sql ---
alter table public.products
  add column if not exists cost_gross_cents integer not null default 0
    check (cost_gross_cents >= 0);

-- --- 20260512120000_customers_entity.sql ---
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  document_id text,
  shipping_address text,
  shipping_city text,
  shipping_postal_code text,
  notes text,
  source text not null default 'manual'
    check (source in ('manual', 'storefront')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index customers_email_normalized_unique
on public.customers ((lower(trim(email))))
where email is not null and length(trim(email)) > 0;

create index customers_name_idx on public.customers (name);

create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

alter table public.orders
  add column if not exists customer_id uuid references public.customers (id) on delete set null;

create index if not exists orders_customer_id_idx on public.orders (customer_id);

alter table public.customers enable row level security;

create policy "customers_select_admin"
on public.customers
for select
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));

create policy "customers_insert_admin"
on public.customers
for insert
to authenticated
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid())
);

create policy "customers_update_admin"
on public.customers
for update
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()))
with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

create policy "customers_delete_admin"
on public.customers
for delete
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));

-- --- 20260513120000_customer_addresses.sql ---
create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  label text not null default 'Casa',
  address_line text not null default '',
  reference text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index customer_addresses_customer_id_idx
on public.customer_addresses (customer_id, sort_order);

alter table public.customer_addresses enable row level security;

create policy "customer_addresses_select_admin"
on public.customer_addresses
for select
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));

create policy "customer_addresses_insert_admin"
on public.customer_addresses
for insert
to authenticated
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid())
);

create policy "customer_addresses_update_admin"
on public.customer_addresses
for update
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()))
with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

create policy "customer_addresses_delete_admin"
on public.customer_addresses
for delete
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));
