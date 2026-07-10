-- Tarifas de envío por municipio (tienda) + costo en pedidos.

create table if not exists public.store_shipping_municipalities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department text,
  rate_cents integer not null default 0 check (rate_cents >= 0),
  is_enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists store_shipping_municipalities_name_normalized_unique
  on public.store_shipping_municipalities ((lower(trim(name))));

create index if not exists store_shipping_municipalities_enabled_sort_idx
  on public.store_shipping_municipalities (is_enabled, sort_order, name);

drop trigger if exists store_shipping_municipalities_set_updated_at
  on public.store_shipping_municipalities;
create trigger store_shipping_municipalities_set_updated_at
before update on public.store_shipping_municipalities
for each row execute function public.set_updated_at();

alter table public.store_shipping_municipalities enable row level security;

drop policy if exists "store_shipping_municipalities_select_public"
  on public.store_shipping_municipalities;
create policy "store_shipping_municipalities_select_public"
on public.store_shipping_municipalities
for select
to anon, authenticated
using (is_enabled = true);

drop policy if exists "store_shipping_municipalities_select_admin"
  on public.store_shipping_municipalities;
create policy "store_shipping_municipalities_select_admin"
on public.store_shipping_municipalities
for select
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "store_shipping_municipalities_insert_admin"
  on public.store_shipping_municipalities;
create policy "store_shipping_municipalities_insert_admin"
on public.store_shipping_municipalities
for insert
to authenticated
with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "store_shipping_municipalities_update_admin"
  on public.store_shipping_municipalities;
create policy "store_shipping_municipalities_update_admin"
on public.store_shipping_municipalities
for update
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()))
with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "store_shipping_municipalities_delete_admin"
  on public.store_shipping_municipalities;
create policy "store_shipping_municipalities_delete_admin"
on public.store_shipping_municipalities
for delete
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));

alter table public.orders
  add column if not exists shipping_cents integer not null default 0
    check (shipping_cents >= 0);

alter table public.orders
  add column if not exists shipping_municipality_id uuid
    references public.store_shipping_municipalities (id) on delete set null;

comment on column public.orders.shipping_cents is
  'Costo de envío cobrado en el pedido (COP enteros).';

comment on column public.orders.shipping_municipality_id is
  'Municipio tarifado elegido en checkout (si aplica).';

create index if not exists orders_shipping_municipality_id_idx
  on public.orders (shipping_municipality_id);

-- Ejemplos iniciales (editables desde el backoffice).
insert into public.store_shipping_municipalities (name, department, rate_cents, is_enabled, sort_order)
select v.name, v.department, v.rate_cents, v.is_enabled, v.sort_order
from (
  values
    ('Guacarí', 'Valle del Cauca', 8000, true, 10),
    ('Buga', 'Valle del Cauca', 10000, true, 20),
    ('Cali', 'Valle del Cauca', 15000, true, 30),
    ('Palmira', 'Valle del Cauca', 12000, true, 40)
) as v(name, department, rate_cents, is_enabled, sort_order)
where not exists (
  select 1
  from public.store_shipping_municipalities m
  where lower(trim(m.name)) = lower(trim(v.name))
);
