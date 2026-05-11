-- Permitir que usuarios autenticados con perfil admin creen pedidos e ítems (POS / factura manual).
drop policy if exists "orders_insert_admin" on public.orders;
create policy "orders_insert_admin"
on public.orders
for insert
to authenticated
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid())
);

drop policy if exists "order_items_insert_admin" on public.order_items;
create policy "order_items_insert_admin"
on public.order_items
for insert
to authenticated
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid())
);

-- Rollback seguro si falla la inserción de ítems (pedido huérfano).
drop policy if exists "orders_delete_admin" on public.orders;
create policy "orders_delete_admin"
on public.orders
for delete
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "order_items_delete_admin" on public.order_items;
create policy "order_items_delete_admin"
on public.order_items
for delete
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));
