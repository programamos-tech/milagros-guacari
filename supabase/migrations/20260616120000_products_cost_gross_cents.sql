-- Costo de compra con IVA (factura proveedor), para valoración de stock y reportes.
-- `cost_cents` sigue siendo la base sin IVA; `cost_gross_cents` es el desembolso bruto por unidad.

alter table public.products
  add column if not exists cost_gross_cents integer not null default 0
    check (cost_gross_cents >= 0);

comment on column public.products.cost_gross_cents is
  'Costo unitario de compra con IVA (COP). Reporte de inversión en stock con IVA.';
