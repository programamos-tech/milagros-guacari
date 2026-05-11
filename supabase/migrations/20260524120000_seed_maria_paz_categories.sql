-- Categorías de vitrina (alineadas con admin). Idempotente por nombre.
insert into public.categories (name, sort_order)
select v.name, v.sort_order
from (
  values
    ('Cuidado corporal', 10),
    ('Vitaminas y suplementos', 20),
    ('Cuidado de la piel', 30),
    ('Maquillaje', 40),
    ('Termos', 50),
    ('Ropa', 60),
    ('Bolsos', 70),
    ('Zapatos', 80)
) as v(name, sort_order)
where not exists (
  select 1 from public.categories c where c.name = v.name
);
