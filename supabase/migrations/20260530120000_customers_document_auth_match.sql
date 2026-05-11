-- Emparejar cuenta tienda con clientes manuales/POS por cédula (solo dígitos).

create or replace function public.normalize_document_id(p text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(coalesce(trim(p), ''), '\D', '', 'g'), '');
$$;

comment on function public.normalize_document_id(text) is
  'Documento solo con dígitos; vacío si no queda nada (cédula/NIT sin puntos ni guiones).';

create or replace function public.find_customer_id_by_document_normalized(p_normalized text)
returns uuid
language sql
stable
as $$
  select c.id
  from public.customers c
  where public.normalize_document_id(c.document_id) is not null
    and public.normalize_document_id(c.document_id) = p_normalized
    and p_normalized is not null
    and length(p_normalized) >= 6
  order by c.created_at asc
  limit 1;
$$;

comment on function public.find_customer_id_by_document_normalized(text) is
  'Cliente más antiguo con el mismo documento normalizado; vincular auth tienda.';

create index if not exists customers_document_id_normalized_idx
  on public.customers (public.normalize_document_id(document_id))
  where public.normalize_document_id(document_id) is not null;

revoke all on function public.normalize_document_id(text) from public;
revoke all on function public.find_customer_id_by_document_normalized(text) from public;
grant execute on function public.normalize_document_id(text) to service_role;
grant execute on function public.find_customer_id_by_document_normalized(text) to service_role;
