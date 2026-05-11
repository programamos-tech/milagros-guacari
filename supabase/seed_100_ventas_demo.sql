-- Simula ~100 ventas (orders + order_items) para probar Reportes, Ventas y dashboards.
-- Ejecuta en Supabase → SQL Editor (rol que omita RLS, p. ej. postgres) o: `supabase db execute -f ...`
--
-- No descuenta stock de productos (solo datos de lectura para la UI).
-- Si ya corriste el script, los clientes sim.* no se duplican; las órdenes sí se agregan de nuevo
-- si vuelves a ejecutar — borra órdenes de prueba antes si quieres empezar de cero:
--   DELETE FROM public.orders WHERE customer_email LIKE 'sim.ventas.%@example.local';

BEGIN;

-- Clientes de demostración (emails únicos)
INSERT INTO public.customers (name, email, phone, document_id, source)
SELECT
  'Cliente sim ' || i,
  'sim.ventas.' || i || '@example.local',
  '300' || lpad((1000000 + i)::text, 7, '0'),
  lpad((i * 7919)::text, 8, '0'),
  'manual'
FROM generate_series(1, 35) AS i
WHERE NOT EXISTS (
  SELECT 1 FROM public.customers c WHERE c.email = 'sim.ventas.' || i || '@example.local'
);

DO $$
DECLARE
  i int;
  oid uuid;
  cid uuid;
  cname text;
  cemail text;
  pid uuid;
  pname text;
  pprice int;
  n_lines int;
  j int;
  qty int;
  line_total int;
  order_total int;
  pay_roll numeric;
  st public.order_status;
  wref text;
  cust_n int;
  prod_n int;
  ts timestamptz;
BEGIN
  SELECT count(*)::int INTO prod_n FROM public.products;
  IF prod_n < 1 THEN
    RAISE EXCEPTION 'No hay productos en public.products. Crea al menos uno antes de correr este seed.';
  END IF;

  SELECT count(*)::int INTO cust_n FROM public.customers;
  IF cust_n < 1 THEN
    RAISE EXCEPTION 'No hay clientes. El bloque INSERT anterior debería haber creado sim.ventas.* — revisa la migración de customers.';
  END IF;

  FOR i IN 1..100 LOOP
    SELECT c.id, c.name, COALESCE(NULLIF(trim(c.email), ''), 'pos-' || replace(c.id::text, '-', '') || '@local.invalid')
    INTO cid, cname, cemail
    FROM public.customers c
    ORDER BY random()
    LIMIT 1;

    oid := gen_random_uuid();
    order_total := 0;

    -- Mezcla de pagos POS / “en línea” (sin prefijo POS)
    pay_roll := random();
    IF pay_roll < 0.38 THEN
      wref := 'POS:cash';
    ELSIF pay_roll < 0.72 THEN
      wref := 'POS:transfer';
    ELSIF pay_roll < 0.88 THEN
      wref := 'POS:mixed';
    ELSE
      wref := NULL;
    END IF;

    -- Estados: mayoría pagadas, algunas anuladas / pendientes
    IF random() < 0.12 THEN
      st := 'cancelled';
    ELSIF random() < 0.06 THEN
      st := 'pending';
    ELSE
      st := 'paid';
    END IF;

    -- ~40 ventas en las últimas 24 h (para “Hoy” en reportes UTC); el resto repartido en ~115 días
    IF i <= 40 THEN
      ts := now() - (random() * interval '24 hours');
    ELSE
      ts := now() - (floor(random() * 115)::int || ' days')::interval
        - (floor(random() * 86400)::int || ' seconds')::interval;
    END IF;

    INSERT INTO public.orders (
      id,
      status,
      customer_name,
      customer_email,
      customer_id,
      total_cents,
      currency,
      wompi_reference,
      shipping_address,
      shipping_phone,
      created_at
    )
    VALUES (
      oid,
      st,
      cname,
      cemail,
      cid,
      0,
      'COP',
      wref,
      CASE WHEN random() < 0.3 THEN 'Retiro en tienda' ELSE NULL END,
      CASE WHEN random() < 0.5 THEN '300' || lpad((floor(random() * 9999999))::bigint::text, 7, '0') ELSE NULL END,
      ts
    );

    n_lines := 1 + floor(random() * 3)::int; -- 1 a 3 líneas

    FOR j IN 1..n_lines LOOP
      SELECT p.id, p.name, COALESCE(p.price_cents, 0)::int
      INTO pid, pname, pprice
      FROM public.products p
      ORDER BY random()
      LIMIT 1;

      qty := 1 + floor(random() * 4)::int;
      line_total := pprice * qty;
      order_total := order_total + line_total;

      INSERT INTO public.order_items (
        order_id,
        product_id,
        quantity,
        unit_price_cents,
        product_name_snapshot
      )
      VALUES (oid, pid, qty, pprice, left(pname, 200));
    END LOOP;

    UPDATE public.orders SET total_cents = order_total WHERE id = oid;
  END LOOP;

  RAISE NOTICE 'Insertadas 100 órdenes de demostración.';
END $$;

COMMIT;
