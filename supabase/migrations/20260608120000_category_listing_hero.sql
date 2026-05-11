-- Imagen destacada opcional en /products?category=… (archivo en /public, URL absoluta o ruta Storage bucket/clave).
alter table public.categories
  add column if not exists listing_hero_image_path text,
  add column if not exists listing_hero_alt_text text;

comment on column public.categories.listing_hero_image_path is
  'Ej.: bolsos.jpg → /public/bolsos.jpg; o store-banners/uuid.jpg; o https://...';
comment on column public.categories.listing_hero_alt_text is
  'Texto alternativo de la imagen para accesibilidad.';

-- Ejemplo: categoría Bolsos + asset en public/bolsos.jpg (solo si aún no tiene imagen)
update public.categories
set
  listing_hero_image_path = 'bolsos.jpg',
  listing_hero_alt_text = 'Bolsos'
where lower(trim(name)) = 'bolsos'
  and (
    listing_hero_image_path is null
    or trim(listing_hero_image_path) = ''
  );
