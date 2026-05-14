import Link from "next/link";
import { CustomerAvatar } from "@/components/admin/CustomerAvatar";
import { TeamRolesInfoCollapse } from "@/components/admin/TeamRolesInfoCollapse";
import { loadAdminPermissions } from "@/lib/load-admin-permissions";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { storeBrand } from "@/lib/brand";

export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  role: string;
  created_at: string;
  display_name: string | null;
  login_username: string | null;
  public_email: string | null;
  job_role: string | null;
  branch_label: string | null;
  avatar_variant: string | null;
  is_active: boolean | null;
  permissions: unknown;
};

function jobDescription(jobRole: string | null | undefined): string {
  if (jobRole === "owner") {
    return "Acceso completo a todas las funcionalidades del sistema.";
  }
  if (jobRole === "support") {
    return "Apoyo operativo; los permisos concretos los definís en su ficha.";
  }
  return "Registra ventas, pedidos y realiza cierres de caja.";
}

function jobBadgeClass(jobRole: string | null | undefined): string {
  if (jobRole === "owner") {
    return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-800/60";
  }
  if (jobRole === "support") {
    return "bg-violet-50 text-violet-800 ring-1 ring-violet-100 dark:bg-violet-950/45 dark:text-violet-200 dark:ring-violet-800/55";
  }
  return "bg-sky-50 text-sky-800 ring-1 ring-sky-100 dark:bg-sky-950/45 dark:text-sky-200 dark:ring-sky-800/55";
}

function jobLabel(jobRole: string | null | undefined): string {
  if (jobRole === "owner") return "Dueño";
  if (jobRole === "support") return "Apoyo";
  return "Cajero";
}

export default async function AdminUsuariosRolesPage() {
  const authPerm = await loadAdminPermissions();
  const canManageCollaborators = Boolean(
    authPerm?.permissions.colaboradores_gestionar,
  );

  const supabase = await createSupabaseServerClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  const emailByUserId = new Map<string, string>();
  try {
    const service = createSupabaseServiceClient();
    const { data } = await service.auth.admin.listUsers({ perPage: 200 });
    for (const u of data?.users ?? []) {
      if (u.email) emailByUserId.set(u.id, u.email);
    }
  } catch {
    /* sin SUPABASE_SERVICE_ROLE_KEY: solo public_email en perfiles */
  }

  if (error) {
    return (
      <div className="w-full min-w-0 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-100">
        No se pudieron cargar los perfiles. Aplica la migración{" "}
        <code className="rounded bg-amber-100/80 px-1 py-0.5 text-xs dark:bg-amber-900/50">
          20260516120000_profiles_team_roles.sql
        </code>{" "}
        y revisa políticas RLS.
      </div>
    );
  }

  const rows = (profiles ?? []) as ProfileRow[];

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            Equipo
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            Gestioná colaboradores, roles y permisos en {storeBrand}.
          </p>
        </div>
        {canManageCollaborators ? (
          <Link
            href="/admin/usuarios/nuevo"
            className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-rose-950 bg-rose-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-900 hover:border-rose-900 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            <span className="text-lg leading-none" aria-hidden>
              +
            </span>
            Nuevo colaborador
          </Link>
        ) : null}
      </div>

      <TeamRolesInfoCollapse storeLabel={storeBrand} />

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-zinc-200/90 bg-white px-5 py-10 text-center text-sm text-zinc-500 shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-700/90 dark:bg-zinc-900 dark:text-zinc-400 dark:shadow-none dark:ring-white/[0.06]">
          Todavía no hay colaboradores con perfil en esta tienda.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const title =
              row.display_name?.trim() ||
              row.login_username?.trim() ||
              "Colaborador";
            const email =
              row.public_email?.trim() || emailByUserId.get(row.id) || "—";
            const jobRole = row.job_role ?? "cashier";
            const avatarSeed = `${(email !== "—" ? email : row.id).toLowerCase()}:av:${(row.avatar_variant ?? "A").slice(0, 1)}`;

            return (
              <li
                key={row.id}
                className="flex flex-col rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-none dark:ring-white/[0.06]"
              >
                <div className="flex gap-4">
                  <CustomerAvatar
                    seed={avatarSeed}
                    size={56}
                    className="ring-2 ring-zinc-200/90 dark:ring-zinc-600"
                    label={`Avatar de ${title}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
                    <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{email}</p>
                  </div>
                </div>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                  {jobDescription(jobRole)}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                  <span
                    className="inline-flex size-2 shrink-0 rounded-full bg-zinc-900 dark:bg-zinc-100"
                    aria-hidden
                  />
                  <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200/70 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600">
                    {row.is_active === false ? "Inactivo" : "Activo"}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${jobBadgeClass(jobRole)}`}
                  >
                    {jobLabel(jobRole)}
                  </span>
                  {canManageCollaborators ? (
                    <Link
                      href={`/admin/usuarios/${row.id}/edit`}
                      className="ml-auto inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:shadow-none dark:hover:bg-zinc-700"
                    >
                      Editar
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
