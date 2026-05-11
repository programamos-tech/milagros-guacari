-- Inventario: bodega + local. Total = stock_warehouse + stock_local (columna generada stock_quantity).
alter table public.products
  add column if not exists stock_warehouse integer not null default 0
    check (stock_warehouse >= 0);

alter table public.products
  add column if not exists stock_local integer not null default 0
    check (stock_local >= 0);

do $$
begin
  if exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'products'
      and c.column_name = 'stock_quantity'
      and c.is_generated = 'NEVER'
  ) then
    update public.products
    set
      stock_local = greatest(0, coalesce(stock_quantity, 0)),
      stock_warehouse = 0;

    alter table public.products drop column stock_quantity;

    alter table public.products
      add column stock_quantity integer
      generated always as (stock_warehouse + stock_local) stored;
  end if;
end $$;
