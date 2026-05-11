-- La política "profiles_select_team" con EXISTS sobre public.profiles provoca
-- recursión en RLS y el middleware puede no ver la fila propia → error=no_profile.
-- Esta función corre como SECURITY DEFINER y lee profiles sin aplicar RLS al rol owner.

create or replace function public.user_has_admin_profile()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid()
  );
$$;

comment on function public.user_has_admin_profile() is
  'Comprueba si existe fila en profiles para auth.uid(); sin recursión RLS.';

grant execute on function public.user_has_admin_profile() to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_team" on public.profiles;

-- Lectura: siempre la propia fila; si ya sos admin, podés listar el resto del equipo.
create policy "profiles_select_access"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
  or public.user_has_admin_profile()
);
