-- Fecha de nacimiento del cliente (tienda / cuenta), editable por el dueño vía RLS storefront.

alter table public.customers
  add column if not exists birth_date date;

comment on column public.customers.birth_date is 'Opcional. Usado para saludos / campañas; el cliente la gestiona desde su cuenta.';
