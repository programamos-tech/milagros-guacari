import Link from "next/link";
import { Suspense } from "react";
import {
  VentasFiltersBar,
  VentasRefreshButton,
} from "@/components/admin/VentasFiltersBar";
import { VentasPagination } from "@/components/admin/VentasPagination";
import { VentasSalesTable, type VentaOrderRow } from "@/components/admin/VentasSalesTable";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminPanelClass } from "@/lib/admin-ui";
import {
  matchesVentaPagoFilter,
  ventaNumeroReferencia,
  type VentaEstadoFilter,
  type VentaPagoFilter,
} from "@/lib/ventas-sales";

export const dynamic = "force-dynamic";

const VENTAS_PAGE_SIZE = 20;

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function FiltersFallback() {
  return (
    <div className="h-24 animate-pulse rounded-t-xl border-b border-zinc-100 bg-zinc-50/50 px-4 dark:border-zinc-800 dark:bg-zinc-800/40 sm:px-5" />
  );
}

export default async function AdminVentasPage({ searchParams }: Props) {
  const sp = await searchParams;
  const qRaw = typeof sp.q === "string" ? sp.q : "";
  const q = qRaw.trim().toLowerCase();
  const status = (typeof sp.status === "string" ? sp.status : "all") as VentaEstadoFilter;
  const payment = (typeof sp.payment === "string" ? sp.payment : "all") as VentaPagoFilter;
  const pageRaw = typeof sp.page === "string" ? Number.parseInt(sp.page, 10) : 1;
  const pageRequested =
    Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id,status,customer_name,total_cents,created_at,wompi_reference,customer_email",
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

  let rows: VentaOrderRow[] = (data ?? []) as VentaOrderRow[];

  if (status !== "all") {
    rows = rows.filter((r) => r.status === status);
  }
  if (payment !== "all") {
    rows = rows.filter((r) => matchesVentaPagoFilter(r.wompi_reference, payment));
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

  const buildPageHref = (p: number) => {
    const params = new URLSearchParams();
    if (qRaw.trim()) params.set("q", qRaw.trim());
    if (status !== "all") params.set("status", status);
    if (payment !== "all") params.set("payment", payment);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/admin/ventas?${qs}` : "/admin/ventas";
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl md:text-3xl">
            Ventas
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Gestioná facturas de mostrador y pedidos con envío desde un solo lugar.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:shrink-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <VentasRefreshButton />
          <Link
            href="/admin/ventas/nueva"
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white sm:min-w-0"
          >
            + Nueva factura
          </Link>
        </div>
      </div>

      <div className={adminPanelClass}>
        <Suspense fallback={<FiltersFallback />}>
          <VentasFiltersBar initialQ={qRaw} />
        </Suspense>
        <VentasSalesTable rows={pageRows} />
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

