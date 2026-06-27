-- Pago mixto POS: guardar desglose efectivo / transferencia por pedido.

alter table public.orders
  add column if not exists pos_mixed_cash_cents integer,
  add column if not exists pos_mixed_transfer_cents integer;

comment on column public.orders.pos_mixed_cash_cents is
  'Porción en efectivo (centavos) cuando wompi_reference = POS:mixed.';
comment on column public.orders.pos_mixed_transfer_cents is
  'Porción en transferencia (centavos) cuando wompi_reference = POS:mixed.';
