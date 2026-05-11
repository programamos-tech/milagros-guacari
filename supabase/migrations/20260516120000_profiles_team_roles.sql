-- Campos de colaborador, permisos granulares (JSON) y listado de equipo en el panel.
alter table public.profiles
  add column if not exists display_name text,
  add column if not exists login_username text,
  add column if not exists public_email text,
  add column if not exists job_role text not null default 'owner'
    check (job_role in ('owner', 'cashier')),
  add column if not exists permissions jsonb not null default '{}'::jsonb,
  add column if not exists branch_label text,
  add column if not exists avatar_variant text not null default 'A',
  add column if not exists is_active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists profiles_login_username_lower_key
on public.profiles (lower(trim(login_username)))
where login_username is not null and length(trim(login_username)) > 0;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Ver otros perfiles del equipo (listado Equipo).
drop policy if exists "profiles_select_team" on public.profiles;
create policy "profiles_select_team"
on public.profiles
for select
to authenticated
using (exists (select 1 from public.profiles me where me.id = auth.uid()));

-- Editar fichas de colaboradores desde el panel.
drop policy if exists "profiles_update_team" on public.profiles;
create policy "profiles_update_team"
on public.profiles
for update
to authenticated
using (exists (select 1 from public.profiles me where me.id = auth.uid()))
with check (exists (select 1 from public.profiles me2 where me2.id = auth.uid()));
