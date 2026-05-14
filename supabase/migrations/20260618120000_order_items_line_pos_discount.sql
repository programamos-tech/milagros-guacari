-- Descuentos por línea en facturas POS (porcentaje o monto fijo sobre neto de línea post-mayorista).

alter table public.order_items
  add column if not exists line_discount_percent smallint
    constraint order_items_line_discount_percent_range
    check (
      line_discount_percent is null
      or (line_discount_percent >= 0 and line_discount_percent <= 100)
    ),
  add column if not exists line_discount_amount_cents integer not null default 0
    constraint order_items_line_discount_amount_non_negative
    check (line_discount_amount_cents >= 0);

comment on column public.order_items.line_discount_percent is
  'Descuento POS sobre neto de línea (post-mayorista): % 1–100; si aplica, line_discount_amount_cents debe ser 0.';
comment on column public.order_items.line_discount_amount_cents is
  'Descuento POS en COP (centavos) sobre neto total de línea; solo si no hay line_discount_percent > 0.';
