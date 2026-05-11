-- Referencia interna, marca y costo de compra (opcional en UI; defaults seguros).
alter table public.products
  add column if not exists reference text not null default '';

alter table public.products
  add column if not exists brand text not null default '';

alter table public.products
  add column if not exists cost_cents integer not null default 0
    check (cost_cents >= 0);
