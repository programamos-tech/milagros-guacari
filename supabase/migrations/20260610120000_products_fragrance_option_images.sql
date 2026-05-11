-- Mapa opcional fragancia (texto exacto como en fragrance_options) → ruta de imagen (mismo formato que image_path).
alter table public.products
  add column if not exists fragrance_option_images jsonb not null default '{}'::jsonb;
