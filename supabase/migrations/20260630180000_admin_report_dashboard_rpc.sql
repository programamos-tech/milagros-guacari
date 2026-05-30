-- Reportes admin: agregados en Postgres (1 round-trip) + columna is_cancelled en egresos.

alter table public.store_expenses
  add column if not exists is_cancelled boolean not null default false,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text;

create index if not exists store_expenses_active_date_idx
  on public.store_expenses (expense_date desc, created_at desc)
  where (is_cancelled = false);

create or replace function public.admin_report_dashboard_agg(
  p_fetch_from date,
  p_fetch_to date,
  p_range_from date,
  p_range_to date,
  p_chart_from date,
  p_chart_to date
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_gte timestamptz;
  v_lt timestamptz;
  v_result jsonb;
begin
  if p_fetch_from is null or p_fetch_to is null
     or p_range_from is null or p_range_to is null
     or p_chart_from is null or p_chart_to is null then
    return '{}'::jsonb;
  end if;

  v_gte := (p_fetch_from::text || ' 00:00:00')::timestamp at time zone 'America/Bogota';
  v_lt := ((p_fetch_to + 1)::text || ' 00:00:00')::timestamp at time zone 'America/Bogota';

  with order_rows as (
    select
      o.id,
      o.status,
      o.total_cents,
      o.created_at,
      coalesce(o.wompi_reference, '') as wompi_reference,
      to_char(o.created_at at time zone 'America/Bogota', 'YYYY-MM-DD') as day_key
    from orders o
    where o.created_at >= v_gte
      and o.created_at < v_lt
  ),
  order_period as (
    select *
    from order_rows
    where day_key >= p_range_from::text
      and day_key <= p_range_to::text
  ),
  order_chart as (
    select *
    from order_rows
    where day_key >= p_chart_from::text
      and day_key <= p_chart_to::text
      and status = 'paid'
  ),
  order_stats as (
    select
      coalesce(sum(case when status = 'paid' then greatest(0, coalesce(total_cents, 0)) else 0 end), 0)::bigint as total_cobrado,
      coalesce(sum(case when status = 'paid' and wompi_reference = 'POS:cash'
        then greatest(0, coalesce(total_cents, 0)) else 0 end), 0)::bigint as efectivo,
      coalesce(sum(case when status = 'paid'
        and (
          wompi_reference in ('POS:transfer', 'POS:mixed')
          or wompi_reference not like 'POS:%'
        )
        then greatest(0, coalesce(total_cents, 0)) else 0 end), 0)::bigint as transferencia,
      coalesce(count(*) filter (where status = 'cancelled'), 0)::int as anuladas,
      coalesce(sum(case when status = 'paid' and wompi_reference not like 'POS:%'
        then greatest(0, coalesce(total_cents, 0)) else 0 end), 0)::bigint as ventas_virtuales,
      coalesce(count(*) filter (where status = 'paid'), 0)::int as ventas_pagadas,
      coalesce(jsonb_agg(to_jsonb(id)) filter (where status = 'paid'), '[]'::jsonb) as paid_order_ids
    from order_period
  ),
  chart_stats as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'day_key', day_key,
          'income_cents', income_cents,
          'order_count', order_count
        )
        order by day_key
      ),
      '[]'::jsonb
    ) as points
    from (
      select
        day_key,
        coalesce(sum(greatest(0, coalesce(total_cents, 0))), 0)::bigint as income_cents,
        count(*)::int as order_count
      from order_chart
      group by day_key
    ) d
  ),
  expense_rows as (
    select
      e.id,
      e.concept,
      e.category,
      e.amount_cents,
      e.payment_method,
      e.created_at,
      coalesce(e.is_cancelled, false) as is_cancelled,
      coalesce(
        nullif(left(trim(e.expense_date::text), 10), ''),
        to_char(e.created_at at time zone 'America/Bogota', 'YYYY-MM-DD')
      ) as day_key
    from store_expenses e
    where e.expense_date >= p_fetch_from
      and e.expense_date <= p_fetch_to
  ),
  expense_stats as (
    select
      coalesce(sum(case when not is_cancelled and day_key >= p_range_from::text and day_key <= p_range_to::text
        then greatest(0, coalesce(amount_cents, 0)) else 0 end), 0)::bigint as egresos_period,
      coalesce(count(*) filter (
        where not is_cancelled and day_key >= p_range_from::text and day_key <= p_range_to::text
      ), 0)::int as cantidad_egresos,
      coalesce(sum(case when not is_cancelled and day_key >= p_range_from::text and day_key <= p_range_to::text
        and lower(trim(coalesce(payment_method, ''))) = 'efectivo'
        then greatest(0, coalesce(amount_cents, 0)) else 0 end), 0)::bigint as egresos_efectivo,
      coalesce(sum(case when not is_cancelled and day_key >= p_range_from::text and day_key <= p_range_to::text
        and lower(trim(coalesce(payment_method, ''))) <> 'efectivo'
        then greatest(0, coalesce(amount_cents, 0)) else 0 end), 0)::bigint as egresos_otros
    from expense_rows
  ),
  expense_chart as (
    select coalesce(
      jsonb_object_agg(day_key, day_total),
      '{}'::jsonb
    ) as by_day
    from (
      select
        day_key,
        sum(greatest(0, coalesce(amount_cents, 0)))::bigint as day_total
      from expense_rows
      where not is_cancelled
        and day_key >= p_chart_from::text
        and day_key <= p_chart_to::text
      group by day_key
    ) d
  ),
  expense_lines as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'concept', concept,
          'amount_cents', amount_cents,
          'expense_date', day_key,
          'payment_method', payment_method,
          'category', category,
          'created_at', created_at
        )
        order by day_key desc, created_at desc nulls last
      ) filter (
        where not is_cancelled
          and day_key >= p_range_from::text
          and day_key <= p_range_to::text
      ),
      '[]'::jsonb
    ) as lines
    from expense_rows
  )
  select jsonb_build_object(
    'totalCobradoPedidos', (select total_cobrado from order_stats),
    'efectivo', (select efectivo from order_stats),
    'transferencia', (select transferencia from order_stats),
    'anuladas', (select anuladas from order_stats),
    'ventasVirtuales', (select ventas_virtuales from order_stats),
    'ventasPagadasPeriod', (select ventas_pagadas from order_stats),
    'paidOrderIds', (select paid_order_ids from order_stats),
    'chartPoints', (select points from chart_stats),
    'expensesByChartDay', (select by_day from expense_chart),
    'egresosPeriod', (select egresos_period from expense_stats),
    'cantidadEgresosPeriod', (select cantidad_egresos from expense_stats),
    'egresosEfectivoCents', (select egresos_efectivo from expense_stats),
    'egresosTransferenciaBucketCents', (select egresos_otros from expense_stats),
    'expenseLines', (select lines from expense_lines)
  )
  into v_result;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

grant execute on function public.admin_report_dashboard_agg(date, date, date, date, date, date) to authenticated;
