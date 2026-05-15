-- Checkout por transferencia: datos de pago en env + comprobantes en Storage.

alter table public.orders
  add column if not exists checkout_payment_method text not null default 'wompi'
    check (checkout_payment_method in ('wompi', 'transfer'));

alter table public.orders
  add column if not exists transfer_session_token uuid unique;

alter table public.orders
  add column if not exists transfer_upload_deadline_at timestamptz;

comment on column public.orders.checkout_payment_method is
  'wompi: pasarela; transfer: pago manual con comprobante en tienda.';

comment on column public.orders.transfer_session_token is
  'Token opaco en URL post-checkout; valida ventana de subida de comprobante.';

comment on column public.orders.transfer_upload_deadline_at is
  'Fin de la ventana actual (2 min) para subir comprobante; null si no hay ventana activa.';

create table if not exists public.order_transfer_proofs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  storage_path text not null,
  original_filename text,
  created_at timestamptz not null default now()
);

create index if not exists order_transfer_proofs_order_id_idx
  on public.order_transfer_proofs (order_id, created_at desc);

alter table public.order_transfer_proofs enable row level security;

drop policy if exists "order_transfer_proofs_select_admin" on public.order_transfer_proofs;
create policy "order_transfer_proofs_select_admin"
on public.order_transfer_proofs for select to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()));

-- Subidas solo desde backend (service role); sin insert policy para anon/authenticated.

insert into storage.buckets (id, name, public)
values ('order-payment-proofs', 'order-payment-proofs', false)
on conflict (id) do nothing;

drop policy if exists "order_payment_proofs_admin_select" on storage.objects;
create policy "order_payment_proofs_admin_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'order-payment-proofs'
  and exists (select 1 from public.profiles p where p.id = auth.uid())
);
