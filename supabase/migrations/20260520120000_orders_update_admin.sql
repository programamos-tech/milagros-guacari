-- Permitir que admins autenticados actualicen pedidos (estado de factura en el panel).
drop policy if exists "orders_update_admin" on public.orders;
create policy "orders_update_admin"
on public.orders
for update
to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid())
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid())
);
