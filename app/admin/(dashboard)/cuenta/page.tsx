import { updateAdminAccountPassword } from "@/app/actions/admin/account-password";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";

const shellCard =
  "rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-sm shadow-zinc-950/5 ring-1 ring-zinc-950/5 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none dark:ring-white/[0.06]";

function jobRoleLabel(role: string | null | undefined): string {
  const r = String(role ?? "").toLowerCase();
  if (r === "owner") return "Propietario";
  if (r === "cashier") return "Cajero";
  if (r === "support") return "Soporte";
  return role ? String(role) : "—";
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default async function AdminCuentaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const errorMsg =
    typeof sp.error === "string" ? decodeURIComponent(sp.error) : null;
  const ok = sp.ok === "1" || sp.ok === "true";
  const forbiddenNotice = sp.notice === "forbidden";

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "display_name, login_username, public_email, job_role, branch_label, avatar_variant, updated_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sinceIso = thirtyDaysAgo.toISOString();

  const [
    productsCount,
    customersCount,
    ordersPaidCount,
    ordersPaid30d,
    expensesCount,
    suppliersCount,
    activity30d,
  ] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "paid"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "paid")
      .gte("created_at", sinceIso),
    supabase.from("store_expenses").select("id", { count: "exact", head: true }),
    supabase.from("suppliers").select("id", { count: "exact", head: true }),
    supabase
      .from("admin_activity_log")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sinceIso),
  ]);

  const displayName =
    profile?.display_name?.trim() ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Usuario";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Mi cuenta
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Tu perfil en el panel, seguridad y un vistazo de cómo el sistema te
          ayuda a organizar el negocio.
        </p>
      </div>

      {ok ? (
        <div
          className="rounded-xl border border-emerald-200/90 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100"
          role="status"
        >
          Contraseña actualizada correctamente.
        </div>
      ) : null}
      {errorMsg ? (
        <div
          className="rounded-xl border border-red-200/90 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100"
          role="alert"
        >
          {errorMsg}
        </div>
      ) : null}
      {forbiddenNotice ? (
        <div
          className="rounded-xl border border-amber-200/90 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
          role="status"
        >
          No tenés permiso para abrir esa sección del panel. Pedile al dueño que revise tu rol en
          Equipo.
        </div>
      ) : null}

      <section className={shellCard}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Tu perfil
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Nombre
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {displayName}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Correo de acceso
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {user.email ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Usuario para iniciar sesión
            </dt>
            <dd className="mt-0.5 font-mono text-sm text-zinc-900 dark:text-zinc-100">
              {profile?.login_username?.trim() || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Rol en el equipo
            </dt>
            <dd className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-100">
              {jobRoleLabel(profile?.job_role)}
            </dd>
          </div>
          {profile?.public_email?.trim() ? (
            <div>
              <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Correo público (contacto)
              </dt>
              <dd className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-100">
                {profile.public_email.trim()}
              </dd>
            </div>
          ) : null}
          {profile?.branch_label?.trim() ? (
            <div>
              <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Sucursal / etiqueta
              </dt>
              <dd className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-100">
                {profile.branch_label.trim()}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Cuenta creada
            </dt>
            <dd className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-100">
              {formatDate(user.created_at)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Avatar (variante)
            </dt>
            <dd className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-100">
              {profile?.avatar_variant ?? "—"}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
          Por seguridad no mostramos tu contraseña actual (nadie puede verla).
          Puedes cambiarla en la sección de abajo.
        </p>
      </section>

      <section className={shellCard}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Seguridad
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Elige una contraseña nueva para tu cuenta de administrador. Debe tener
          al menos 8 caracteres.
        </p>
        <form action={updateAdminAccountPassword} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="account-password"
              className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Nueva contraseña
            </label>
            <input
              id="account-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="mt-1 w-full max-w-md rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>
          <div>
            <label
              htmlFor="account-password-confirm"
              className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Confirmar contraseña
            </label>
            <input
              id="account-password-confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="mt-1 w-full max-w-md rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg border border-rose-950 bg-rose-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-900 hover:border-rose-900 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Actualizar contraseña
          </button>
        </form>
      </section>

      <section className={shellCard}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Tu negocio en números
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Resumen de lo que ya tienes registrado en el panel. Úsalo para ver de
          un vistazo cómo va tu operación.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Productos"
            value={productsCount.count ?? 0}
            href="/admin/products"
          />
          <StatCard
            label="Clientes"
            value={customersCount.count ?? 0}
            href="/admin/customers"
          />
          <StatCard
            label="Pedidos pagados (total)"
            value={ordersPaidCount.count ?? 0}
            href="/admin/orders"
          />
          <StatCard
            label="Pedidos pagados (últimos 30 días)"
            value={ordersPaid30d.count ?? 0}
            href="/admin/orders"
          />
          <StatCard
            label="Gastos registrados"
            value={expensesCount.count ?? 0}
            href="/admin/egresos"
          />
          <StatCard
            label="Proveedores"
            value={suppliersCount.count ?? 0}
            href="/admin/proveedores"
          />
          <StatCard
            label="Movimientos en el panel (30 días)"
            value={activity30d.count ?? 0}
            href="/admin/actividades"
          />
        </ul>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="block rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4 transition hover:border-zinc-300 hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-950/50 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/80"
      >
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {label}
        </p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          {value}
        </p>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Abrir en el panel →
        </p>
      </Link>
    </li>
  );
}
