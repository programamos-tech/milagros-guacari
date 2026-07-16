-- Barrio y punto de referencia en envío (checkout tienda).

alter table public.orders
  add column if not exists shipping_neighborhood text,
  add column if not exists shipping_reference text;

comment on column public.orders.shipping_neighborhood is
  'Barrio / sector de entrega indicado en checkout.';

comment on column public.orders.shipping_reference is
  'Punto de referencia para ubicar la dirección.';

alter table public.customers
  add column if not exists shipping_neighborhood text,
  add column if not exists shipping_reference text;
