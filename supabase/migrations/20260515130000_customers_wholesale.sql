-- Tipo de cliente (consumidor final vs mayorista) y descuento % solo para mayoristas.

alter table public.customers
  add column if not exists customer_kind text not null default 'retail'
    check (customer_kind in ('retail', 'wholesale'));

alter table public.customers
  add column if not exists wholesale_discount_percent smallint not null default 0
    check (wholesale_discount_percent >= 0 and wholesale_discount_percent <= 100);

comment on column public.customers.customer_kind is
  'retail = consumidor final; wholesale = mayorista (precio con wholesale_discount_percent).';

comment on column public.customers.wholesale_discount_percent is
  'Descuento sobre precio de catálogo (neto); solo aplica si customer_kind = wholesale.';

-- El comprador autenticado no puede cambiar tipo ni % (solo admin vía panel).
create or replace function public.customers_preserve_wholesale_fields_for_store_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  if exists (select 1 from public.profiles p where p.id = auth.uid()) then
    return new;
  end if;
  if new.id is distinct from old.id then
    return new;
  end if;
  if old.auth_user_id is null or old.auth_user_id is distinct from auth.uid() then
    return new;
  end if;
  new.customer_kind := old.customer_kind;
  new.wholesale_discount_percent := old.wholesale_discount_percent;
  return new;
end;
$$;

drop trigger if exists customers_preserve_wholesale_fields on public.customers;

create trigger customers_preserve_wholesale_fields
before update on public.customers
for each row
execute function public.customers_preserve_wholesale_fields_for_store_owner();
