alter table public.categories
  add column if not exists icon_key text;

update public.categories
set icon_key = case
  when name = 'Cuidado corporal' then 'hand-heart'
  when name = 'Vitaminas y suplementos' then 'pill'
  when name = 'Cuidado de la piel' then 'sparkles'
  when name = 'Maquillaje' then 'paintbrush'
  when name = 'Termos' then 'thermometer'
  when name = 'Ropa' then 'shirt'
  when name = 'Bolsos' then 'shopping-bag'
  when name = 'Zapatos' then 'footprints'
  else coalesce(icon_key, 'tag')
end
where icon_key is null;

update public.categories
set icon_key = 'tag'
where icon_key is null or btrim(icon_key) = '';

alter table public.categories
  alter column icon_key set default 'tag',
  alter column icon_key set not null;
