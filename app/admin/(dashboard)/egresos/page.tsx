import Link from "next/link";
import { formatCop } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminEgresosPage({
  searchParams: _searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createSupabaseServerClient();

  const { data: expenses } = await supabase
    .from("store_expenses")
    .select("id,concept,category,amount_cents,payment_method,notes,expense_date,created_at")
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(300);

  const rows = expenses ?? [];
  const total = rows.reduce((sum, e) => sum + Number(e.amount_cents ?? 0), 0);
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayTotal = rows.reduce((sum, e) => {
    const key =
      typeof e.expense_date === "string"
        ? e.expense_date
        : String(e.created_at ?? "").slice(0, 10);
    return key === todayKey ? sum + Number(e.amount_cents ?? 0) : sum;
  }, 0);
  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-8">
      <div className="mb-2 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <Link href="/admin" className="hover:text-zinc-800 dark:hover:text-zinc-200">
              Reportes
            </Link>
            <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">/</span>
            <span className="text-zinc-700 dark:text-zinc-300">Tabla de egresos</span>
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl md:text-3xl">
            Egresos
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            Vista de tabla con todos los egresos registrados.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-[0_1px_0_0_rgb(24_24_27/0.04)] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-none">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <p className="text-zinc-500 dark:text-zinc-400">Hoy</p>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{formatCop(todayTotal)}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Acumulado: {formatCop(total)}
              </p>
            </div>
          </div>
          <Link
            href="/admin/egresos/nuevo"
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            + Nuevo egreso
          </Link>
          <Link
            href="/admin"
            className="inline-flex size-10 items-center justify-center rounded-lg border border-zinc-200/90 bg-white text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Volver a reportes"
          >
            <span className="text-lg leading-none" aria-hidden>
              ←
            </span>
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200/90 bg-white shadow-[0_1px_0_0_rgb(24_24_27/0.04)] dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-none">
        <div className="border-b border-zinc-100 px-4 py-4 dark:border-zinc-800 sm:px-5">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
            Historial de egresos
          </h2>
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400 sm:px-5">
            Aún no hay egresos registrados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">
                <tr>
                  <th className="px-4 py-3 sm:px-5">Concepto</th>
                  <th className="px-4 py-3 sm:px-5">Categoría</th>
                  <th className="px-4 py-3 sm:px-5">Pago</th>
                  <th className="px-4 py-3 sm:px-5">Fecha</th>
                  <th className="px-4 py-3 text-right sm:px-5">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {rows.map((e) => (
                  <tr key={String(e.id)} className="align-top">
                    <td className="px-4 py-3 sm:px-5">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {String(e.concept ?? "Egreso")}
                      </p>
                      {e.notes ? (
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                          {String(e.notes)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 sm:px-5">
                      {String(e.category ?? "operativo")}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 sm:px-5">
                      {String(e.payment_method ?? "—")}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 sm:px-5">
                      {String(e.expense_date ?? String(e.created_at ?? "").slice(0, 10))}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-zinc-900 dark:text-zinc-100 sm:px-5">
                      {formatCop(Number(e.amount_cents ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

