import { Suspense } from "react";
import Link from "next/link";
import { VentasFilteredSummary } from "@/components/admin/VentasFilteredSummary";
import {
  VentasFiltersBar,
  VentasRefreshButton,
} from "@/components/admin/VentasFiltersBar";
import { VentasPagination } from "@/components/admin/VentasPagination";
import { VentasSalesTable } from "@/components/admin/VentasSalesTable";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminPanelClass } from "@/lib/admin-ui";
import { fetchAdminVentasPage, type VentaOrderRow } from "@/lib/supabase/admin-ventas-list";
import { buildAdminVentasListHref } from "@/lib/admin-ventas-list-url";
import type { VentasFilterStats } from "@/lib/ventas-filter-stats";
import type { VentaEstadoFilter, VentaPagoFilter } from "@/lib/ventas-sales";

const VENTAS_PAGE_SIZE = 20;

function VentasTableSkeleton() {
  return (
    <div className="border-t border-zinc-100 dark:border-zinc-800" role="status">
      <span className="sr-only">Cargando ventas…</span>
      <div className="space-y-0 divide-y divide-zinc-100 dark:divide-zinc-800">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex animate-pulse items-center gap-4 px-4 py-4 motion-reduce:animate-none sm:px-5"
          >
            <div className="h-4 w-24 rounded bg-zinc-200/80 dark:bg-zinc-800" />
            <div className="h-4 max-w-xs flex-1 rounded bg-zinc-200/60 dark:bg-zinc-800/80" />
            <div className="h-4 w-20 rounded bg-zinc-200/80 dark:bg-zinc-800" />
          </div>
        ))}
      </div>
    </div>
  );
}

export async function VentasPageBody({
  qRaw,
  status,
  payment,
  dateFrom,
  dateTo,
  pageRequested,
}: {
  qRaw: string;
  status: VentaEstadoFilter;
  payment: VentaPagoFilter;
  dateFrom: string | null;
  dateTo: string | null;
  pageRequested: number;
}) {
  const supabase = await createSupabaseServerClient();

  let page = pageRequested;
  let pageRows: VentaOrderRow[] = [];
  let totalFiltered = 0;
  let filterStats: VentasFilterStats = {
    totalCents: 0,
    cashCents: 0,
    transferCents: 0,
    mixedCents: 0,
    otherCents: 0,
    paidCount: 0,
  };
  let error: string | null = null;

  try {
    ({ rows: pageRows, total: totalFiltered, filterStats, error } =
      await fetchAdminVentasPage(supabase, {
        q: qRaw,
        status,
        payment,
        dateFrom,
        dateTo,
        page,
        pageSize: VENTAS_PAGE_SIZE,
      }));
  } catch (err) {
    console.error("[ventas] fetchAdminVentasPage:", err);
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/80 dark:bg-amber-950/35 dark:text-amber-100">
        No se pudieron cargar las ventas. Reintenta o contacta soporte si persiste.
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/80 dark:bg-amber-950/35 dark:text-amber-100">
        No se pudieron cargar las ventas: {error}
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(totalFiltered / VENTAS_PAGE_SIZE));
  if (page > totalPages && totalFiltered > 0) {
    page = totalPages;
    ({ rows: pageRows, total: totalFiltered, filterStats } =
      await fetchAdminVentasPage(supabase, {
        q: qRaw,
        status,
        payment,
        dateFrom,
        dateTo,
        page,
        pageSize: VENTAS_PAGE_SIZE,
      }));
  }

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
    <div className={`${adminPanelClass} overflow-hidden`}>
      <div className="border-b border-rose-100/80 bg-rose-50/25 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-800/30 sm:px-4 md:px-5">
        <VentasFilteredSummary stats={filterStats} />
      </div>
      <Suspense
        fallback={
          <div
            className="border-b border-zinc-100 px-4 py-4 dark:border-zinc-800 sm:px-5"
            role="status"
          >
            <span className="sr-only">Cargando filtros…</span>
            <div className="h-20 animate-pulse rounded-lg bg-zinc-100/80 dark:bg-zinc-800/60 motion-reduce:animate-none" />
          </div>
        }
      >
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
  );
}

export function VentasPageShell({
  qRaw,
  status,
  payment,
  dateFrom,
  dateTo,
  pageRequested,
}: {
  qRaw: string;
  status: VentaEstadoFilter;
  payment: VentaPagoFilter;
  dateFrom: string | null;
  dateTo: string | null;
  pageRequested: number;
}) {
  const suspenseKey = `${qRaw}|${status}|${payment}|${dateFrom ?? ""}|${dateTo ?? ""}|${pageRequested}`;

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
            className="inline-flex items-center justify-center rounded-lg border border-rose-950 bg-rose-950 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:border-rose-900 hover:bg-rose-900 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white sm:min-w-0"
          >
            + Nueva factura
          </Link>
        </div>
      </div>

      <Suspense key={suspenseKey} fallback={<VentasTableSkeleton />}>
        <VentasPageBody
          qRaw={qRaw}
          status={status}
          payment={payment}
          dateFrom={dateFrom}
          dateTo={dateTo}
          pageRequested={pageRequested}
        />
      </Suspense>
    </div>
  );
}
