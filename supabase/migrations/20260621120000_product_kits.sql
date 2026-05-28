-- Kits / combos: varios productos vendidos como una unidad con precio y descuento propios.

create table public.product_kits (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  image_path text,
  is_published boolean not null default false,
  /** sum_discount: precio = suma componentes × (1 − descuento/100). fixed: price_cents fijo. */
  pricing_mode text not null default 'sum_discount'
    check (pricing_mode in ('sum_discount', 'fixed')),
  discount_percent integer not null default 0
    check (discount_percent >= 0 and discount_percent <= 100),
  price_cents integer not null default 0
    check (price_cents >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_kit_items (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null references public.product_kits (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  sort_order integer not null default 0,
  unique (kit_id, product_id)
);

create index product_kit_items_kit_id_idx on public.product_kit_items (kit_id, sort_order);
create index product_kits_published_sort_idx on public.product_kits (is_published, sort_order, name);

create trigger product_kits_set_updated_at
before update on public.product_kits
for each row execute function public.set_updated_at();

alter table public.order_items
  add column if not exists kit_id uuid references public.product_kits (id) on delete set null;

alter table public.order_items
  add column if not exists kit_component_deductions jsonb;

comment on column public.order_items.kit_id is 'Línea de venta que representa un kit (product_id puede ser null).';
comment on column public.order_items.kit_component_deductions is
  'Al vender kit: [{product_id, stock_deducted_local, stock_deducted_warehouse}, ...] para restaurar stock al anular.';

alter table public.product_kits enable row level security;
alter table public.product_kit_items enable row level security;

create policy "product_kits_select_published"
on public.product_kits
for select
to anon, authenticated
using (is_published = true);

create policy "product_kits_select_admin"
on public.product_kits
for select
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));

create policy "product_kits_insert_admin"
on public.product_kits
for insert
to authenticated
with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

create policy "product_kits_update_admin"
on public.product_kits
for update
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()))
with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

create policy "product_kits_delete_admin"
on public.product_kits
for delete
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));

create policy "product_kit_items_select_published"
on public.product_kit_items
for select
to anon, authenticated
using (
  exists (
    select 1 from public.product_kits k
    where k.id = kit_id and k.is_published = true
  )
);

create policy "product_kit_items_select_admin"
on public.product_kit_items
for select
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));

create policy "product_kit_items_insert_admin"
on public.product_kit_items
for insert
to authenticated
with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

create policy "product_kit_items_update_admin"
on public.product_kit_items
for update
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()))
with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

create policy "product_kit_items_delete_admin"
on public.product_kit_items
for delete
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));
