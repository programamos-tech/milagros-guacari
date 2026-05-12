import Link from "next/link";
import { Suspense } from "react";
import { ExpenseRowActions } from "@/components/admin/ExpenseRowActions";
import { ExpensesFiltersBar } from "@/components/admin/ExpensesFiltersBar";
import { formatCop } from "@/lib/money";
import { todayYmdInReportStore } from "@/lib/admin-report-range";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

function searchParamFirst(
  v: string | string[] | undefined,
): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

function normalizeDateRange(
  fromRaw: string | undefined,
  toRaw: string | undefined,
): { from: string | null; to: string | null } {
  let f =
    fromRaw && YMD_RE.test(fromRaw.trim()) ? fromRaw.trim() : null;
  let t = toRaw && YMD_RE.test(toRaw.trim()) ? toRaw.trim() : null;
  if (f && t && f > t) {
    const x = f;
    f = t;
    t = x;
  }
  return { from: f, to: t };
}

function sanitizeIlikeQuery(q: string) {
  return q.replace(/[%_\\,]/g, "").slice(0, 80);
}

export default async function AdminEgresosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const qRaw = (searchParamFirst(sp.q) ?? "").trim();
  const { from: dateFrom, to: dateTo } = normalizeDateRange(
    searchParamFirst(sp.from),
    searchParamFirst(sp.to),
  );

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("store_expenses")
    .select("id,concept,amount_cents,payment_method,notes,expense_date,created_at")
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1500);

  if (dateFrom) {
    query = query.gte("expense_date", dateFrom);
  }
  if (dateTo) {
    query = query.lte("expense_date", dateTo);
  }

  if (UUID_RE.test(qRaw)) {
    query = query.eq("id", qRaw);
  } else {
    const qSan = sanitizeIlikeQuery(qRaw);
    if (qSan.length > 0) {
      const pattern = `%${qSan}%`;
      query = query.or(`concept.ilike.${pattern},notes.ilike.${pattern}`);
    }
  }

  const { data: expenses, error: expensesError } = await query;

  const rows = expenses ?? [];
  const total = rows.reduce((sum, e) => sum + Number(e.amount_cents ?? 0), 0);
  const todayKey = todayYmdInReportStore();
  const todayTotal = rows.reduce((sum, e) => {
    const key =
      typeof e.expense_date === "string"
        ? e.expense_date
        : String(e.created_at ?? "").slice(0, 10);
    return key === todayKey ? sum + Number(e.amount_cents ?? 0) : sum;
  }, 0);

  const hasFilters =
    qRaw.length > 0 || Boolean(dateFrom) || Boolean(dateTo);

  const filterLabelClass =
    "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600 dark:text-zinc-400";

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
            Vista de tabla con filtros por texto y rango de fechas del gasto.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-[0_1px_0_0_rgb(24_24_27/0.04)] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-none">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <p className="text-zinc-500 dark:text-zinc-400">Hoy (vista)</p>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{formatCop(todayTotal)}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Total filtrado: {formatCop(total)}
              </p>
            </div>
          </div>
          <Link
            href="/admin/egresos/nuevo"
            className="inline-flex items-center justify-center rounded-lg border border-rose-950 bg-rose-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-900 hover:border-rose-900 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
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
        <Suspense
          fallback={
            <div className="border-b border-zinc-100 px-4 py-4 dark:border-zinc-800 sm:px-5">
              <label className={filterLabelClass}>Concepto / notas</label>
              <div
                className="mt-1.5 h-[42px] animate-pulse rounded-lg border border-zinc-200 bg-zinc-100/80 dark:border-zinc-700 dark:bg-zinc-800/60"
                aria-hidden
              />
            </div>
          }
        >
          <ExpensesFiltersBar
            initialQ={qRaw}
            initialFrom={dateFrom ?? ""}
            initialTo={dateTo ?? ""}
          />
        </Suspense>

        <div className="border-b border-zinc-100 px-4 py-4 dark:border-zinc-800 sm:px-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
              Historial de egresos
            </h2>
            {hasFilters ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {rows.length}{" "}
                {rows.length === 1 ? "resultado" : "resultados"}
              </p>
            ) : null}
          </div>
        </div>
        {expensesError ? (
          <p className="px-4 py-6 text-sm text-amber-800 dark:text-amber-200 sm:px-5">
            No se pudieron aplicar los filtros: {expensesError.message}
          </p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400 sm:px-5">
            {hasFilters
              ? "No hay egresos que coincidan con la búsqueda o las fechas."
              : "Aún no hay egresos registrados."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-0 text-left text-sm xl:min-w-[960px]">
              <thead>
                <tr className="border-b border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-950/80">
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                    Concepto
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                    Pago
                  </th>
                  <th className="min-w-[9.5rem] whitespace-nowrap px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                    Fecha
                  </th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                    Monto
                  </th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e, index) => {
                  const zebra =
                    index % 2 === 1
                      ? "bg-zinc-50/80 dark:bg-zinc-900/50"
                      : "bg-white dark:bg-zinc-900";
                  const dateStr = String(
                    e.expense_date ?? String(e.created_at ?? "").slice(0, 10),
                  );
                  return (
                    <tr
                      key={String(e.id)}
                      className={`border-b border-zinc-100/90 ${zebra} align-top transition hover:bg-zinc-100/60 dark:border-zinc-800 dark:hover:bg-zinc-800/50`}
                    >
                      <td className="max-w-md px-4 py-3.5">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {String(e.concept ?? "Egreso")}
                        </p>
                        {e.notes ? (
                          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                            {String(e.notes)}
                          </p>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-zinc-600 dark:text-zinc-300">
                        {String(e.payment_method ?? "—")}
                      </td>
                      <td className="min-w-[9.5rem] whitespace-nowrap px-4 py-3.5 tabular-nums text-zinc-600 dark:text-zinc-300">
                        {dateStr}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                        {formatCop(Number(e.amount_cents ?? 0))}
                      </td>
                      <td className="px-4 py-3.5">
                        <ExpenseRowActions expenseId={String(e.id)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
