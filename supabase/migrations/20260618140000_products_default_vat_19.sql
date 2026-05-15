-- Nuevos productos: IVA 19 % (tipo general CO) activado por defecto.
alter table public.products
  alter column has_vat set default true;

alter table public.products
  alter column vat_percent set default 19;
