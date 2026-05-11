-- Categories for catalog organization + optional FK on products
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index categories_sort_order_idx on public.categories (sort_order, name);

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

alter table public.products
  add column category_id uuid references public.categories (id) on delete set null;

create index products_category_id_idx on public.products (category_id);

alter table public.categories enable row level security;

-- Vitrina: lectura de categorías para filtros / futuro menú
create policy "categories_select_public"
on public.categories
for select
to anon, authenticated
using (true);

create policy "categories_insert_admin"
on public.categories
for insert
to authenticated
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid())
);

create policy "categories_update_admin"
on public.categories
for update
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()))
with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

create policy "categories_delete_admin"
on public.categories
for delete
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));
