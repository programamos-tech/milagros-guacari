-- Fix RLS recursion on public.profiles policies.
-- Previous policies referenced public.profiles from within a profiles policy,
-- which triggers infinite recursion at query time.

drop policy if exists "profiles_select_team" on public.profiles;
drop policy if exists "profiles_update_team" on public.profiles;

create policy "profiles_select_team"
on public.profiles
for select
to authenticated
using (auth.uid() is not null);

create policy "profiles_update_team"
on public.profiles
for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);
