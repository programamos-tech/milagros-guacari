-- Motivo obligatorio al anular desde el panel (UI + auditoría).
alter table public.orders
  add column if not exists cancellation_reason text;

comment on column public.orders.cancellation_reason is
  'Texto libre con el motivo de anulación; se limpia si el pedido deja de estar cancelado.';
