-- Optional shipping / contact fields captured at checkout
alter table public.orders
  add column if not exists shipping_phone text,
  add column if not exists shipping_address text,
  add column if not exists shipping_city text,
  add column if not exists shipping_postal_code text;
