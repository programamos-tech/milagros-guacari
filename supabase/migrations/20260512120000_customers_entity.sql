-- Clientes unificados (e-commerce + tienda física / facturación manual)
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

-- Un email no vacío = único (normalizado en app con lower(trim))
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

-- Misma definición que 20260506120000_orders_shipping.sql (idempotente si ya la aplicaste).
alter table public.orders
  add column if not exists shipping_phone text,
  add column if not exists shipping_address text,
  add column if not exists shipping_city text,
  add column if not exists shipping_postal_code text;

-- Datos existentes: un cliente por email de pedido + enlace
insert into public.customers (
  name,
  email,
  phone,
  shipping_address,
  shipping_city,
  shipping_postal_code,
  source
)
select
  s.name,
  s.email,
  s.phone,
  s.shipping_address,
  s.shipping_city,
  s.shipping_postal_code,
  'storefront'
from (
  select distinct on (lower(trim(o.customer_email)))
    o.customer_name as name,
    lower(trim(o.customer_email)) as email,
    o.shipping_phone as phone,
    o.shipping_address as shipping_address,
    o.shipping_city as shipping_city,
    o.shipping_postal_code as shipping_postal_code
  from public.orders o
  where trim(o.customer_email) <> ''
  order by lower(trim(o.customer_email)), o.created_at desc
) s
where not exists (
  select 1 from public.customers c where c.email = s.email
);

update public.orders o
set customer_id = c.id
from public.customers c
where o.customer_id is null
  and trim(o.customer_email) <> ''
  and c.email = lower(trim(o.customer_email));

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
