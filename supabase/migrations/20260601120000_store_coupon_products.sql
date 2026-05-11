-- Productos elegibles por cupón (vacío = descuento aplica a todo el carrito).

create table public.store_coupon_products (
  coupon_id uuid not null references public.store_coupons(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (coupon_id, product_id)
);

create index store_coupon_products_product_id_idx
  on public.store_coupon_products (product_id);

alter table public.store_coupon_products enable row level security;

drop policy if exists "store_coupon_products_select_admin" on public.store_coupon_products;
create policy "store_coupon_products_select_admin"
on public.store_coupon_products
for select
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "store_coupon_products_insert_admin" on public.store_coupon_products;
create policy "store_coupon_products_insert_admin"
on public.store_coupon_products
for insert
to authenticated
with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "store_coupon_products_delete_admin" on public.store_coupon_products;
create policy "store_coupon_products_delete_admin"
on public.store_coupon_products
for delete
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));
