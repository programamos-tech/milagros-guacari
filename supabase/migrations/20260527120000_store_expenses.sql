-- Egresos operativos de la tienda para control administrativo.
create table if not exists public.store_expenses (
  id uuid primary key default gen_random_uuid(),
  concept text not null,
  category text not null default 'operativo',
  amount_cents integer not null check (amount_cents >= 0),
  payment_method text not null default 'transferencia',
  notes text,
  expense_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists store_expenses_date_idx
on public.store_expenses (expense_date desc, created_at desc);

alter table public.store_expenses enable row level security;

drop policy if exists "store_expenses_select_admin" on public.store_expenses;
create policy "store_expenses_select_admin"
on public.store_expenses
for select
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "store_expenses_insert_admin" on public.store_expenses;
create policy "store_expenses_insert_admin"
on public.store_expenses
for insert
to authenticated
with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "store_expenses_update_admin" on public.store_expenses;
create policy "store_expenses_update_admin"
on public.store_expenses
for update
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()))
with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "store_expenses_delete_admin" on public.store_expenses;
create policy "store_expenses_delete_admin"
on public.store_expenses
for delete
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));
