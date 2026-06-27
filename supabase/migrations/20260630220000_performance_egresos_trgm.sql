-- Búsquedas admin POS (ilike %term%) y agregados de egresos sin barrer filas en Node.

create extension if not exists pg_trgm with schema extensions;

create index if not exists products_name_trgm_idx
  on public.products using gin (name extensions.gin_trgm_ops);

create index if not exists products_reference_trgm_idx
  on public.products using gin (reference extensions.gin_trgm_ops);

create index if not exists customers_name_trgm_idx
  on public.customers using gin (name extensions.gin_trgm_ops);

create index if not exists customers_email_trgm_idx
  on public.customers using gin (email extensions.gin_trgm_ops);

create index if not exists store_expenses_concept_trgm_idx
  on public.store_expenses using gin (concept extensions.gin_trgm_ops);

/**
 * Totales de egresos filtrados. Replica filtros de `lib/supabase/admin-expenses-list.ts`.
 * Día calendario de la tienda: America/Bogota (coincide con REPORT_STORE_TIME_ZONE).
 */
create or replace function public.admin_egresos_filter_stats(
  p_date_from date default null,
  p_date_to date default null,
  p_q text default null
)
returns json
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_q text := nullif(trim(coalesce(p_q, '')), '');
  v_today date := (now() at time zone 'America/Bogota')::date;
  v_result json;
begin
  select json_build_object(
    'totalActivoCents',
      coalesce(sum(
        case when coalesce(e.is_cancelled, false) = false
          then greatest(0, coalesce(e.amount_cents, 0))
          else 0 end
      ), 0),
    'todayTotalCents',
      coalesce(sum(
        case when coalesce(e.is_cancelled, false) = false
          and (
            case
              when e.expense_date is not null then e.expense_date
              else (e.created_at at time zone 'America/Bogota')::date
            end
          ) = v_today
          then greatest(0, coalesce(e.amount_cents, 0))
          else 0 end
      ), 0),
    'cancelledCount',
      coalesce(count(*) filter (where coalesce(e.is_cancelled, false) = true), 0),
    'total',
      coalesce(count(*), 0)
  )
  into v_result
  from store_expenses e
  where (p_date_from is null or e.expense_date >= p_date_from)
    and (p_date_to is null or e.expense_date <= p_date_to)
    and (
      v_q is null
      or (
        v_q ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        and e.id = v_q::uuid
      )
      or e.concept ilike '%' || v_q || '%'
      or coalesce(e.notes, '') ilike '%' || v_q || '%'
    );

  return coalesce(v_result, '{}'::json);
end;
$$;

grant execute on function public.admin_egresos_filter_stats(date, date, text) to authenticated;
