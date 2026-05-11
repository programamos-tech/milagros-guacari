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
