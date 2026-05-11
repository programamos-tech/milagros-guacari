-- Cupones de tienda (banner superior + descuento en checkout). Gestionados desde backoffice.

create table public.store_coupons (
  id uuid primary key default gen_random_uuid(),
  internal_label text,
  banner_message text not null,
  code text not null,
  discount_percent integer not null default 10
    check (discount_percent >= 0 and discount_percent <= 100),
  is_enabled boolean not null default false,
  show_in_banner boolean not null default true,
  sort_order integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index store_coupons_code_normalized_unique
  on public.store_coupons ((lower(trim(code))));

create index store_coupons_enabled_banner_sort_idx
  on public.store_coupons (is_enabled, show_in_banner, sort_order, created_at);

drop trigger if exists store_coupons_set_updated_at on public.store_coupons;
create trigger store_coupons_set_updated_at
before update on public.store_coupons
for each row execute function public.set_updated_at();

alter table public.store_coupons enable row level security;

-- Catálogo: solo cupones habilitados para mostrar en banner (fechas vigentes).
drop policy if exists "store_coupons_select_public_banner" on public.store_coupons;
create policy "store_coupons_select_public_banner"
on public.store_coupons
for select
to anon, authenticated
using (
  is_enabled = true
  and show_in_banner = true
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
);

drop policy if exists "store_coupons_select_admin" on public.store_coupons;
create policy "store_coupons_select_admin"
on public.store_coupons
for select
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "store_coupons_insert_admin" on public.store_coupons;
create policy "store_coupons_insert_admin"
on public.store_coupons
for insert
to authenticated
with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "store_coupons_update_admin" on public.store_coupons;
create policy "store_coupons_update_admin"
on public.store_coupons
for update
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()))
with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "store_coupons_delete_admin" on public.store_coupons;
create policy "store_coupons_delete_admin"
on public.store_coupons
for delete
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));
