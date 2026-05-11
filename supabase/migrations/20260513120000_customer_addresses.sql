-- Direcciones múltiples por cliente (casa, oficina, etc.)
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
