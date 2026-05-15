import Link from "next/link";
import { Suspense } from "react";
import { VentasFilteredSummary } from "@/components/admin/VentasFilteredSummary";
import { computeVentasFilterStats } from "@/lib/ventas-filter-stats";
import {
  VentasFiltersBar,
  VentasRefreshButton,
} from "@/components/admin/VentasFiltersBar";
import { VentasPagination } from "@/components/admin/VentasPagination";
import { VentasSalesTable, type VentaOrderRow } from "@/components/admin/VentasSalesTable";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminPanelClass } from "@/lib/admin-ui";
import { fetchOrdersCreatedInReportYmdWindow } from "@/lib/admin-fetch-orders-for-report";
import { buildAdminVentasListHref } from "@/lib/admin-ventas-list-url";
import { todayYmdInReportStore } from "@/lib/admin-report-range";
import {
  matchesVentaPagoFilter,
  ventaNumeroReferencia,
  type VentaEstadoFilter,
  type VentaPagoFilter,
} from "@/lib/ventas-sales";

export const dynamic = "force-dynamic";

const VENTAS_PAGE_SIZE = 20;

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

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function FiltersFallback() {
  return (
    <div className="h-36 animate-pulse border-b border-zinc-100 bg-zinc-50/50 px-4 dark:border-zinc-800 dark:bg-zinc-800/40 sm:px-5" />
  );
}

export default async function AdminVentasPage({ searchParams }: Props) {
  const sp = await searchParams;
  const qRaw = typeof sp.q === "string" ? sp.q : "";
  const q = qRaw.trim().toLowerCase();
  const status = (typeof sp.status === "string" ? sp.status : "all") as VentaEstadoFilter;
  const payment = (typeof sp.payment === "string" ? sp.payment : "all") as VentaPagoFilter;
  const { from: dateFrom, to: dateTo } = normalizeDateRange(
    searchParamFirst(sp.from),
    searchParamFirst(sp.to),
  );
  const pageRaw = typeof sp.page === "string" ? Number.parseInt(sp.page, 10) : 1;
  const pageRequested =
    Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

  const supabase = await createSupabaseServerClient();

  let rows: VentaOrderRow[];

  if (dateFrom || dateTo) {
    const today = todayYmdInReportStore();
    let lo: string;
    let hi: string;
    if (dateFrom && dateTo) {
      lo = dateFrom <= dateTo ? dateFrom : dateTo;
      hi = dateFrom <= dateTo ? dateTo : dateFrom;
    } else if (dateFrom) {
      lo = dateFrom;
      hi = today;
    } else {
      lo = "1970-01-01";
      hi = dateTo as string;
    }
    const { rows: fetched, error: rangeErr } = await fetchOrdersCreatedInReportYmdWindow(
      supabase,
      lo,
      hi,
      "id,status,customer_name,total_cents,created_at,wompi_reference,customer_email,checkout_payment_method",
    );
    if (rangeErr) {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/80 dark:bg-amber-950/35 dark:text-amber-100">
          No se pudieron cargar las ventas del periodo: {rangeErr}
        </div>
      );
    }
    rows = fetched as VentaOrderRow[];
  } else {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id,status,customer_name,total_cents,created_at,wompi_reference,customer_email,checkout_payment_method",
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/80 dark:bg-amber-950/35 dark:text-amber-100">
          No se pudieron cargar las ventas. Revisa permisos y conexión.
        </div>
      );
    }
    rows = (data ?? []) as VentaOrderRow[];
  }

  if (status !== "all") {
    rows = rows.filter((r) => r.status === status);
  }
  if (payment !== "all") {
    rows = rows.filter((r) =>
      matchesVentaPagoFilter(r.wompi_reference, payment, {
        checkoutPaymentMethod: r.checkout_payment_method,
      }),
    );
  }
  if (q.length > 0) {
    const qCompact = q.replace(/-/g, "");
    rows = rows.filter((r) => {
      const name = (r.customer_name ?? "").toLowerCase();
      const email = (r.customer_email ?? "").toLowerCase();
      const id = (r.id ?? "").toLowerCase().replace(/-/g, "");
      const ref = ventaNumeroReferencia(r.id).toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        id.includes(qCompact) ||
        ref.includes(q)
      );
    });
  }

  const totalFiltered = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / VENTAS_PAGE_SIZE));
  const page = Math.min(pageRequested, totalPages);
  const offset = (page - 1) * VENTAS_PAGE_SIZE;
  const pageRows = rows.slice(offset, offset + VENTAS_PAGE_SIZE);
  const filterStats = computeVentasFilterStats(rows);

  const buildPageHref = (p: number) =>
    buildAdminVentasListHref({
      q: qRaw,
      status,
      payment,
      from: dateFrom,
      to: dateTo,
      page: p > 1 ? p : undefined,
    });

  const orderListReturnHref = buildAdminVentasListHref({
    q: qRaw,
    status,
    payment,
    from: dateFrom,
    to: dateTo,
    page,
  });

  return (
    <div className="w-full min-w-0 space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl md:text-3xl">
            Ventas
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Gestioná facturas de mostrador y pedidos con envío desde un solo lugar.
          </p>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
          <VentasRefreshButton />
          <Link
            href="/admin/ventas/nueva"
            className="inline-flex items-center justify-center rounded-lg border border-rose-950 bg-rose-950 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-rose-900 hover:border-rose-900 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white sm:min-w-0"
          >
            + Nueva factura
          </Link>
        </div>
      </div>

      <div className={`${adminPanelClass} overflow-hidden`}>
        <div className="border-b border-rose-100/80 bg-rose-50/25 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-800/30 sm:px-4 md:px-5">
          <VentasFilteredSummary stats={filterStats} />
        </div>
        <Suspense fallback={<FiltersFallback />}>
          <VentasFiltersBar
            initialQ={qRaw}
            initialFrom={dateFrom ?? ""}
            initialTo={dateTo ?? ""}
          />
        </Suspense>
        <VentasSalesTable rows={pageRows} orderListReturnHref={orderListReturnHref} />
        <VentasPagination
          page={page}
          pageSize={VENTAS_PAGE_SIZE}
          total={totalFiltered}
          buildHref={buildPageHref}
        />
      </div>
    </div>
  );
}

