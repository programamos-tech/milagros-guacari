-- Vincular usuarios de Auth (compradores) con public.customers y permitir lectura de pedidos propios.

alter table public.customers
  add column if not exists auth_user_id uuid references auth.users (id) on delete set null;

create unique index if not exists customers_auth_user_id_unique
  on public.customers (auth_user_id)
  where auth_user_id is not null;

-- Comprador autenticado sin fila en profiles (no es admin del panel)
create policy "customers_select_store_owner"
on public.customers
for select
to authenticated
using (
  auth_user_id = auth.uid()
  and not exists (select 1 from public.profiles p where p.id = auth.uid())
);

create policy "customers_update_store_owner"
on public.customers
for update
to authenticated
using (
  auth_user_id = auth.uid()
  and not exists (select 1 from public.profiles p where p.id = auth.uid())
)
with check (
  auth_user_id = auth.uid()
  and not exists (select 1 from public.profiles p where p.id = auth.uid())
);

create policy "customer_addresses_select_store_owner"
on public.customer_addresses
for select
to authenticated
using (
  exists (
    select 1 from public.customers c
    where c.id = customer_addresses.customer_id
      and c.auth_user_id = auth.uid()
      and not exists (select 1 from public.profiles p where p.id = auth.uid())
  )
);

create policy "customer_addresses_insert_store_owner"
on public.customer_addresses
for insert
to authenticated
with check (
  exists (
    select 1 from public.customers c
    where c.id = customer_addresses.customer_id
      and c.auth_user_id = auth.uid()
      and not exists (select 1 from public.profiles p where p.id = auth.uid())
  )
);

create policy "customer_addresses_update_store_owner"
on public.customer_addresses
for update
to authenticated
using (
  exists (
    select 1 from public.customers c
    where c.id = customer_addresses.customer_id
      and c.auth_user_id = auth.uid()
      and not exists (select 1 from public.profiles p where p.id = auth.uid())
  )
)
with check (
  exists (
    select 1 from public.customers c
    where c.id = customer_addresses.customer_id
      and c.auth_user_id = auth.uid()
      and not exists (select 1 from public.profiles p where p.id = auth.uid())
  )
);

create policy "customer_addresses_delete_store_owner"
on public.customer_addresses
for delete
to authenticated
using (
  exists (
    select 1 from public.customers c
    where c.id = customer_addresses.customer_id
      and c.auth_user_id = auth.uid()
      and not exists (select 1 from public.profiles p where p.id = auth.uid())
  )
);

create policy "orders_select_store_owner"
on public.orders
for select
to authenticated
using (
  customer_id is not null
  and exists (
    select 1 from public.customers c
    where c.id = orders.customer_id
      and c.auth_user_id = auth.uid()
      and not exists (select 1 from public.profiles p where p.id = auth.uid())
  )
);

create policy "order_items_select_store_owner"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1 from public.orders o
    join public.customers c on c.id = o.customer_id
    where o.id = order_items.order_id
      and c.auth_user_id = auth.uid()
      and not exists (select 1 from public.profiles p where p.id = auth.uid())
  )
);
