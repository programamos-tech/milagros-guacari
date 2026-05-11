-- Proveedores y facturas por pagar (cuentas por pagar), abonos y adjuntos.

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  document_id text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists suppliers_name_idx on public.suppliers (lower(name));

create table if not exists public.supplier_invoices (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  folio text not null,
  total_cents integer not null check (total_cents >= 0),
  issue_date date not null default (current_date),
  notes text,
  is_cancelled boolean not null default false,
  created_at timestamptz not null default now(),
  unique (folio)
);

create index if not exists supplier_invoices_supplier_idx
  on public.supplier_invoices (supplier_id, issue_date desc, created_at desc);

create table if not exists public.supplier_invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.supplier_invoices (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  payment_method text not null default 'transferencia',
  notes text,
  paid_at timestamptz not null default now()
);

create index if not exists supplier_invoice_payments_invoice_idx
  on public.supplier_invoice_payments (invoice_id, paid_at desc);

create table if not exists public.supplier_invoice_attachments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.supplier_invoices (id) on delete cascade,
  storage_path text not null,
  file_name text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists supplier_invoice_attachments_invoice_idx
  on public.supplier_invoice_attachments (invoice_id, sort_order, created_at);

alter table public.suppliers enable row level security;
alter table public.supplier_invoices enable row level security;
alter table public.supplier_invoice_payments enable row level security;
alter table public.supplier_invoice_attachments enable row level security;

-- Misma regla que egresos: cualquier usuario con fila en profiles (staff).
drop policy if exists "suppliers_select_admin" on public.suppliers;
create policy "suppliers_select_admin"
on public.suppliers for select to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "suppliers_insert_admin" on public.suppliers;
create policy "suppliers_insert_admin"
on public.suppliers for insert to authenticated
with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "suppliers_update_admin" on public.suppliers;
create policy "suppliers_update_admin"
on public.suppliers for update to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()))
with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "suppliers_delete_admin" on public.suppliers;
create policy "suppliers_delete_admin"
on public.suppliers for delete to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "supplier_invoices_select_admin" on public.supplier_invoices;
create policy "supplier_invoices_select_admin"
on public.supplier_invoices for select to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "supplier_invoices_insert_admin" on public.supplier_invoices;
create policy "supplier_invoices_insert_admin"
on public.supplier_invoices for insert to authenticated
with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "supplier_invoices_update_admin" on public.supplier_invoices;
create policy "supplier_invoices_update_admin"
on public.supplier_invoices for update to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()))
with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "supplier_invoices_delete_admin" on public.supplier_invoices;
create policy "supplier_invoices_delete_admin"
on public.supplier_invoices for delete to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "supplier_invoice_payments_select_admin" on public.supplier_invoice_payments;
create policy "supplier_invoice_payments_select_admin"
on public.supplier_invoice_payments for select to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "supplier_invoice_payments_insert_admin" on public.supplier_invoice_payments;
create policy "supplier_invoice_payments_insert_admin"
on public.supplier_invoice_payments for insert to authenticated
with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "supplier_invoice_payments_delete_admin" on public.supplier_invoice_payments;
create policy "supplier_invoice_payments_delete_admin"
on public.supplier_invoice_payments for delete to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "supplier_invoice_attachments_select_admin" on public.supplier_invoice_attachments;
create policy "supplier_invoice_attachments_select_admin"
on public.supplier_invoice_attachments for select to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "supplier_invoice_attachments_insert_admin" on public.supplier_invoice_attachments;
create policy "supplier_invoice_attachments_insert_admin"
on public.supplier_invoice_attachments for insert to authenticated
with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "supplier_invoice_attachments_delete_admin" on public.supplier_invoice_attachments;
create policy "supplier_invoice_attachments_delete_admin"
on public.supplier_invoice_attachments for delete to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));

-- Bucket para PDF / imágenes de facturas de proveedor
insert into storage.buckets (id, name, public)
values ('supplier-invoice-files', 'supplier-invoice-files', true)
on conflict (id) do nothing;

drop policy if exists "supplier_invoice_files_public_read" on storage.objects;
create policy "supplier_invoice_files_public_read"
on storage.objects for select to public
using (bucket_id = 'supplier-invoice-files');

drop policy if exists "supplier_invoice_files_admin_insert" on storage.objects;
create policy "supplier_invoice_files_admin_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'supplier-invoice-files'
  and exists (select 1 from public.profiles p where p.id = auth.uid())
);

drop policy if exists "supplier_invoice_files_admin_update" on storage.objects;
create policy "supplier_invoice_files_admin_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'supplier-invoice-files'
  and exists (select 1 from public.profiles p where p.id = auth.uid())
)
with check (
  bucket_id = 'supplier-invoice-files'
  and exists (select 1 from public.profiles p where p.id = auth.uid())
);

drop policy if exists "supplier_invoice_files_admin_delete" on storage.objects;
create policy "supplier_invoice_files_admin_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'supplier-invoice-files'
  and exists (select 1 from public.profiles p where p.id = auth.uid())
);
