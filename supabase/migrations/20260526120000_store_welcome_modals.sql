-- Modal promocional de bienvenida configurable desde backoffice.
create table if not exists public.store_welcome_modals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  discount_code text,
  cta_label text not null default 'Escribir por WhatsApp',
  cta_href text,
  is_enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_welcome_modals_enabled_sort_idx
on public.store_welcome_modals (is_enabled, sort_order, created_at desc);

drop trigger if exists store_welcome_modals_set_updated_at on public.store_welcome_modals;
create trigger store_welcome_modals_set_updated_at
before update on public.store_welcome_modals
for each row execute function public.set_updated_at();

alter table public.store_welcome_modals enable row level security;

drop policy if exists "store_welcome_modals_select_public" on public.store_welcome_modals;
create policy "store_welcome_modals_select_public"
on public.store_welcome_modals
for select
to anon, authenticated
using (is_enabled = true);

drop policy if exists "store_welcome_modals_select_admin" on public.store_welcome_modals;
create policy "store_welcome_modals_select_admin"
on public.store_welcome_modals
for select
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "store_welcome_modals_insert_admin" on public.store_welcome_modals;
create policy "store_welcome_modals_insert_admin"
on public.store_welcome_modals
for insert
to authenticated
with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "store_welcome_modals_update_admin" on public.store_welcome_modals;
create policy "store_welcome_modals_update_admin"
on public.store_welcome_modals
for update
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()))
with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "store_welcome_modals_delete_admin" on public.store_welcome_modals;
create policy "store_welcome_modals_delete_admin"
on public.store_welcome_modals
for delete
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));
