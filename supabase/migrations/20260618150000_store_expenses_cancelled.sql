-- Anulación de egresos (soft cancel) para auditoría sin borrar filas.
alter table public.store_expenses
  add column if not exists is_cancelled boolean not null default false,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text;

create index if not exists store_expenses_active_date_idx
  on public.store_expenses (expense_date desc, created_at desc)
  where (is_cancelled = false);
