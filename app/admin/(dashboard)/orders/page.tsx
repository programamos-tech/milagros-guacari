import Link from "next/link";
import { VentasPagination } from "@/components/admin/VentasPagination";
import {
  createdAtBoundsForReportYmdRange,
  currentYearMonthInReportStore,
  monthYmdBounds,
  prettyYearMonthLabel,
} from "@/lib/admin-report-range";
import { formatStoreDateTime } from "@/lib/store-datetime-format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCop } from "@/lib/money";

export const dynamic = "force-dynamic";

const ORDERS_PAGE_SIZE = 25;

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

const statusLabel: Record<string, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  failed: "Fallido",
  cancelled: "Cancelado",
};

function searchParamFirst(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

function normalizeDateRange(
  fromRaw: string | undefined,
  toRaw: string | undefined,
): { from: string | null; to: string | null } {
  let f = fromRaw && YMD_RE.test(fromRaw.trim()) ? fromRaw.trim() : null;
  let t = toRaw && YMD_RE.test(toRaw.trim()) ? toRaw.trim() : null;
  if (f && t && f > t) {
    const x = f;
    f = t;
    t = x;
  }
  return { from: f, to: t };
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const pageRaw = searchParamFirst(sp.page);
  const pageParsed = pageRaw ? Number.parseInt(pageRaw, 10) : 1;
  const page = Number.isFinite(pageParsed) && pageParsed > 0 ? pageParsed : 1;

  const { from: urlFrom, to: urlTo } = normalizeDateRange(
    searchParamFirst(sp.from),
    searchParamFirst(sp.to),
  );

  const hasExplicitDateFilters = Boolean(urlFrom) || Boolean(urlTo);
  const currentMonth = currentYearMonthInReportStore();
  const monthBounds = monthYmdBounds(currentMonth);
  const defaultMonthApplied = !hasExplicitDateFilters && monthBounds != null;
  const dateFrom = hasExplicitDateFilters ? urlFrom : monthBounds?.from ?? null;
  const dateTo = hasExplicitDateFilters ? urlTo : monthBounds?.to ?? null;
  const periodLabel = defaultMonthApplied
    ? prettyYearMonthLabel(currentMonth)
    : null;

  const fromIdx = (page - 1) * ORDERS_PAGE_SIZE;
  const toIdx = fromIdx + ORDERS_PAGE_SIZE - 1;

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("orders")
    .select("id,status,customer_name,total_cents,created_at", { count: "exact" });

  if (dateFrom || dateTo) {
    const lo = dateFrom ?? "1970-01-01";
    const hi = dateTo ?? dateFrom ?? "1970-01-01";
    const fromYmd = lo <= hi ? lo : hi;
    const toYmd = lo <= hi ? hi : lo;
    const bounds = createdAtBoundsForReportYmdRange(fromYmd, toYmd);
    if (bounds) {
      query = query.gte("created_at", bounds.gte).lt("created_at", bounds.lt);
    }
  }

  const { data: orders, count } = await query
    .order("created_at", { ascending: false })
    .range(fromIdx, toIdx);

  const list = orders ?? [];
  const total = count ?? 0;

  const buildPageHref = (targetPage: number) => {
    const p = new URLSearchParams();
    if (urlFrom) p.set("from", urlFrom);
    if (urlTo) p.set("to", urlTo);
    if (targetPage > 1) p.set("page", String(targetPage));
    const qs = p.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900 sm:text-3xl">
          Pedidos
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          {defaultMonthApplied && periodLabel
            ? `Mostrando ${periodLabel}. Añadí ?from= y ?to= en la URL para otro periodo.`
            : "Listado paginado de pedidos de la tienda."}
        </p>
      </div>
      {list.length === 0 ? (
        <p className="text-stone-600">
          {hasExplicitDateFilters
            ? "No hay pedidos en el periodo seleccionado."
            : "Todavía no hay pedidos en este periodo."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white ring-1 ring-stone-100">
          <ul className="divide-y divide-stone-100">
            {list.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition hover:bg-zinc-50"
                >
                  <div>
                    <p className="font-mono text-xs text-stone-500">{o.id}</p>
                    <p className="font-medium text-stone-900">{o.customer_name}</p>
                    <p className="text-xs text-stone-500">
                      {formatStoreDateTime(String(o.created_at), {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-stone-900">
                      {formatCop(o.total_cents as number)}
                    </p>
                    <p className="text-sm text-stone-600">
                      {statusLabel[String(o.status)] ?? o.status}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <VentasPagination
            page={page}
            pageSize={ORDERS_PAGE_SIZE}
            total={total}
            buildHref={buildPageHref}
          />
        </div>
      )}
    </div>
  );
}
