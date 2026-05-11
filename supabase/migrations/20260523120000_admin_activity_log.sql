-- Registro de actividades del panel (trazabilidad).
create table public.admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id uuid not null references public.profiles (id) on delete cascade,
  action_type text not null
    check (
      action_type in (
        'customer_created',
        'customer_updated',
        'product_created',
        'product_updated',
        'stock_adjusted',
        'stock_transferred',
        'sale_created',
        'sale_cancelled'
      )
    ),
  entity_type text,
  entity_id uuid,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb
);

create index admin_activity_log_created_at_idx
  on public.admin_activity_log (created_at desc);

create index admin_activity_log_entity_idx
  on public.admin_activity_log (entity_type, entity_id);

alter table public.admin_activity_log enable row level security;

-- Cualquier colaborador autenticado con perfil puede ver el historial del equipo.
drop policy if exists "admin_activity_log_select_team" on public.admin_activity_log;
create policy "admin_activity_log_select_team"
on public.admin_activity_log
for select
to authenticated
using (exists (select 1 from public.profiles me where me.id = auth.uid()));

-- Solo se puede insertar firmando como el usuario actual (evita suplantación desde el cliente).
drop policy if exists "admin_activity_log_insert_self" on public.admin_activity_log;
create policy "admin_activity_log_insert_self"
on public.admin_activity_log
for insert
to authenticated
with check (
  actor_id = auth.uid()
  and exists (select 1 from public.profiles me where me.id = auth.uid())
);
