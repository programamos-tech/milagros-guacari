-- Normaliza IVA de venta al 19 % (tipo general CO). Evita tasas “adaptadas” p. ej. 18,99 %.
update public.products
set vat_percent = 19
where coalesce(has_vat, false) = true
  and vat_percent is not null
  and vat_percent <> 19;
