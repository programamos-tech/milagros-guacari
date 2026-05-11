alter table public.products
  add column if not exists size_value numeric(10,2),
  add column if not exists size_unit text,
  add column if not exists has_expiration boolean not null default false,
  add column if not exists expiration_date date,
  add column if not exists colors text[] not null default '{}'::text[],
  add column if not exists has_vat boolean not null default false,
  add column if not exists vat_percent numeric(5,2);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_size_value_nonneg'
  ) then
    alter table public.products
      add constraint products_size_value_nonneg
      check (size_value is null or size_value > 0);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_vat_percent_range'
  ) then
    alter table public.products
      add constraint products_vat_percent_range
      check (vat_percent is null or (vat_percent >= 0 and vat_percent <= 100));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_vat_consistency'
  ) then
    alter table public.products
      add constraint products_vat_consistency
      check (has_vat or vat_percent is null);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_size_unit_check'
  ) then
    alter table public.products
      add constraint products_size_unit_check
      check (
        size_unit is null
        or size_unit in ('ml', 'l', 'g', 'kg', 'oz', 'unidad')
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_expiration_consistency'
  ) then
    alter table public.products
      add constraint products_expiration_consistency
      check (has_expiration or expiration_date is null);
  end if;
end
$$;
