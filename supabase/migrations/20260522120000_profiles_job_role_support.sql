-- Tercer rol de colaborador (negocio pequeño): apoyo / soporte en tienda.
alter table public.profiles drop constraint if exists profiles_job_role_check;
alter table public.profiles
  add constraint profiles_job_role_check
  check (job_role in ('owner', 'cashier', 'support'));
