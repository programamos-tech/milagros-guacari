-- Idempotente: si supplier_invoice_lines no existe (migración 20260613150000 no corrida o fallida),
-- la creamos aquí. Si existe sin IVA, añadimos vat_rate_bps.
-- Requiere public.supplier_invoices (migración 20260612140000_suppliers_invoices.sql).

create table if not exists public.supplier_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.supplier_invoices (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name_snapshot text not null,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  vat_rate_bps integer not null default 0 check (vat_rate_bps >= 0 and vat_rate_bps <= 10000),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists supplier_invoice_lines_invoice_idx
  on public.supplier_invoice_lines (invoice_id, sort_order);

alter table public.supplier_invoice_lines enable row level security;

alter table public.supplier_invoice_lines
  add column if not exists vat_rate_bps integer not null default 0
  check (vat_rate_bps >= 0 and vat_rate_bps <= 10000);

comment on column public.supplier_invoice_lines.vat_rate_bps is
  'Tasa IVA en basis points (1900 = 19%). 0: sin IVA / legacy. >0: unitario neto, IVA = redondeo(cant×unitario×tasa/10000).';

drop policy if exists "supplier_invoice_lines_select_admin" on public.supplier_invoice_lines;
create policy "supplier_invoice_lines_select_admin"
on public.supplier_invoice_lines for select to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "supplier_invoice_lines_insert_admin" on public.supplier_invoice_lines;
create policy "supplier_invoice_lines_insert_admin"
on public.supplier_invoice_lines for insert to authenticated
with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "supplier_invoice_lines_update_admin" on public.supplier_invoice_lines;
create policy "supplier_invoice_lines_update_admin"
on public.supplier_invoice_lines for update to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()))
with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "supplier_invoice_lines_delete_admin" on public.supplier_invoice_lines;
create policy "supplier_invoice_lines_delete_admin"
on public.supplier_invoice_lines for delete to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));
