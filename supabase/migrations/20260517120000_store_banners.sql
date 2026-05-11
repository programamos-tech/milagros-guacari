-- Banners configurables: hero (home) y sección de productos (carruseles posibles).
create table public.store_banners (
  id uuid primary key default gen_random_uuid(),
  placement text not null check (placement in ('hero', 'products')),
  image_path text not null,
  href text,
  alt_text text not null default '',
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create index store_banners_placement_sort_idx
on public.store_banners (placement, sort_order, created_at);

alter table public.store_banners enable row level security;

create policy "store_banners_select_public"
on public.store_banners
for select
to anon, authenticated
using (is_published = true);

create policy "store_banners_select_admin"
on public.store_banners
for select
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));

create policy "store_banners_insert_admin"
on public.store_banners
for insert
to authenticated
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid())
);

create policy "store_banners_update_admin"
on public.store_banners
for update
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()))
with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

create policy "store_banners_delete_admin"
on public.store_banners
for delete
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));

-- Bucket público para imágenes de banners
insert into storage.buckets (id, name, public)
values ('store-banners', 'store-banners', true)
on conflict (id) do nothing;

create policy "store_banners_storage_public_read"
on storage.objects
for select
to public
using (bucket_id = 'store-banners');

create policy "store_banners_storage_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'store-banners'
  and exists (select 1 from public.profiles p where p.id = auth.uid())
);

create policy "store_banners_storage_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'store-banners'
  and exists (select 1 from public.profiles p where p.id = auth.uid())
)
with check (
  bucket_id = 'store-banners'
  and exists (select 1 from public.profiles p where p.id = auth.uid())
);

create policy "store_banners_storage_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'store-banners'
  and exists (select 1 from public.profiles p where p.id = auth.uid())
);
