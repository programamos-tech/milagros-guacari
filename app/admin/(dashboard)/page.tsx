import { ReportsPeriodFilter } from "@/components/admin/ReportsPeriodFilter";
import { CustomerTicketTrendChart } from "@/components/admin/CustomerTicketTrendChart";
import {
  dayInRange,
  dayKeysInclusiveReport,
  parseReportRangeFromSearchParams,
  prettyReportDayShortLabel,
  prettyReportPeriodLabel,
  reportCalendarDayKeyFromIso,
  todayYmdInReportStore,
} from "@/lib/admin-report-range";
import { adminPanelLgClass } from "@/lib/admin-ui";
import { adminLandingPath } from "@/lib/admin-landing";
import { loadAdminPermissions } from "@/lib/load-admin-permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { formatCop } from "@/lib/money";
import type { TicketTrendPoint } from "@/lib/customer-ticket-trend";
import {
  revenueNetGrossFromLines,
  sumGrossProfitNetOnLinesForPaidOrders,
  sumRevenueNetGrossForOrders,
  type OrderItemRow,
  type OrderRowRef,
  type ProductVatRow,
} from "@/lib/order-revenue-vat";
import {
  fetchOrderItemsInChunks,
  fetchOrdersCreatedInReportYmdWindow,
} from "@/lib/admin-fetch-orders-for-report";

export const dynamic = "force-dynamic";

async function fetchProductsForStockInvestment(supabase: SupabaseClient) {
  const full = await supabase
    .from("products")
    .select("stock_quantity,cost_cents,cost_gross_cents");
  if (!full.error) {
    return (full.data ?? []) as {
      stock_quantity?: number | null;
      cost_cents?: number | null;
      cost_gross_cents?: number | null;
    }[];
  }
  const basic = await supabase.from("products").select("stock_quantity,cost_cents");
  return (basic.data ?? []) as {
    stock_quantity?: number | null;
    cost_cents?: number | null;
    cost_gross_cents?: number | null;
  }[];
}

const cardLabelClass =
  "text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-900/40 dark:text-zinc-500";

/** Títulos de sección alineados al detalle de cliente (tracking + zinc). */
const sectionTitleClass =
  "text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600 dark:text-zinc-400";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminHomePage({ searchParams }: PageProps) {
  const perm = await loadAdminPermissions();
  if (!perm) redirect("/admin/login");
  if (!perm.permissions.inicio_reportes) {
    redirect(adminLandingPath(perm.permissions));
  }

  const sp = await searchParams;
  const todayKey = todayYmdInReportStore();
  const { from: rangeFrom, to: rangeTo } = parseReportRangeFromSearchParams(
    sp,
    todayKey,
  );
  const periodLabel = prettyReportPeriodLabel(rangeFrom, rangeTo, todayKey);

  const supabase = await createSupabaseServerClient();
  const [products, expensesRes] = await Promise.all([
    fetchProductsForStockInvestment(supabase),
    supabase
      .from("store_expenses")
      .select("id,concept,category,amount_cents,payment_method,notes,expense_date,created_at")
      .gte("expense_date", rangeFrom)
      .lte("expense_date", rangeTo)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const { rows: ordersRaw, error: ordersRangeError } =
    await fetchOrdersCreatedInReportYmdWindow(
      supabase,
      rangeFrom,
      rangeTo,
      "id,status,total_cents,created_at,wompi_reference",
    );
  if (ordersRangeError) {
    console.error("[admin reportes] orders:", ordersRangeError);
  }
  const expenses = expensesRes.data ?? [];

  const orders = ordersRaw as OrderRowRef[];

  let totalCobradoPedidos = 0;
  let efectivo = 0;
  let transferencia = 0;
  let anuladas = 0;
  let ventasVirtuales = 0;
  let ventasPagadasPeriod = 0;
  let egresosPeriod = 0;
  let cantidadEgresosPeriod = 0;

  for (const o of orders) {
    const createdAt = typeof o.created_at === "string" ? o.created_at : null;
    const dk = createdAt ? reportCalendarDayKeyFromIso(createdAt) : "";
    if (!createdAt || !dayInRange(dk, rangeFrom, rangeTo)) continue;
    const total = Number(o.total_cents ?? 0);
    if (o.status === "paid") {
      ventasPagadasPeriod += 1;
      totalCobradoPedidos += total;
      const ref = String(o.wompi_reference ?? "");
      if (!ref.startsWith("POS:")) {
        ventasVirtuales += total;
      }
      if (ref === "POS:cash") efectivo += total;
      else if (ref === "POS:transfer" || ref === "POS:mixed" || !ref.startsWith("POS:")) {
        transferencia += total;
      }
    } else if (o.status === "cancelled") {
      anuladas += 1;
    }
  }

  const paidPeriodOrders = orders.filter(
    (o) =>
      o.status === "paid" &&
      typeof o.created_at === "string" &&
      dayInRange(reportCalendarDayKeyFromIso(o.created_at), rangeFrom, rangeTo),
  );
  const paidPeriodIds = paidPeriodOrders.map((o) => o.id).filter(Boolean);

  let orderItems: OrderItemRow[] = [];
  const productsById = new Map<string, ProductVatRow>();

  if (paidPeriodIds.length > 0) {
    const { rows: itemRows, error: itemsErr } = await fetchOrderItemsInChunks(
      supabase,
      paidPeriodIds,
      "order_id,product_id,quantity,unit_price_cents",
    );
    if (itemsErr) console.error("[admin reportes] order_items:", itemsErr);
    orderItems = itemRows as OrderItemRow[];
    const pids = [
      ...new Set(
        orderItems.map((i) => i.product_id).filter((id): id is string => Boolean(id)),
      ),
    ];
    if (pids.length > 0) {
      const { data: prodData } = await supabase
        .from("products")
        .select("id,price_cents,has_vat,vat_percent,cost_cents")
        .in("id", pids);
      for (const p of prodData ?? []) {
        productsById.set(p.id as string, p as ProductVatRow);
      }
    }
  }

  const { net: ingresosSinIvaPeriod, gross: ingresosConIvaPeriod } =
    sumRevenueNetGrossForOrders(paidPeriodOrders, orderItems, productsById);
  const ivaRecaudadoPeriod = Math.max(
    0,
    ingresosConIvaPeriod - ingresosSinIvaPeriod,
  );
  const gananciaBruta = sumGrossProfitNetOnLinesForPaidOrders(
    paidPeriodOrders,
    orderItems,
    productsById,
  );

  for (const e of expenses) {
    const raw =
      typeof e.expense_date === "string"
        ? e.expense_date.slice(0, 10)
        : typeof e.created_at === "string"
          ? e.created_at.slice(0, 10)
          : null;
    if (!raw || !dayInRange(raw, rangeFrom, rangeTo)) continue;
    egresosPeriod += Number(e.amount_cents ?? 0);
    cantidadEgresosPeriod += 1;
  }

  const gananciaNeta = gananciaBruta - egresosPeriod;

  const stockInversionNet = products.reduce((sum, p) => {
    const cost = Number((p as { cost_cents?: number | null }).cost_cents ?? 0);
    const stock = Number((p as { stock_quantity?: number | null }).stock_quantity ?? 0);
    return sum + cost * stock;
  }, 0);
  const stockInversionGross = products.reduce((sum, p) => {
    const gross = Number((p as { cost_gross_cents?: number | null }).cost_gross_cents ?? 0);
    const stock = Number((p as { stock_quantity?: number | null }).stock_quantity ?? 0);
    return sum + gross * stock;
  }, 0);
  const trendDayKeys = dayKeysInclusiveReport(rangeFrom, rangeTo);
  const trendDays: { key: string; value: number }[] = trendDayKeys.map((key) => ({
    key,
    value: 0,
  }));

  const trendKeySet = new Set(trendDays.map((d) => d.key));
  const paidTrendOrderIds = orders
    .filter(
      (o) =>
        o.status === "paid" &&
        typeof o.created_at === "string" &&
        trendKeySet.has(reportCalendarDayKeyFromIso(o.created_at)),
    )
    .map((o) => o.id);

  let trendItems: OrderItemRow[] = [];
  const trendProductsById = new Map<string, ProductVatRow>();
  if (paidTrendOrderIds.length > 0) {
    const { rows: trendItemRows, error: trendItemsErr } = await fetchOrderItemsInChunks(
      supabase,
      paidTrendOrderIds,
      "order_id,product_id,quantity,unit_price_cents",
    );
    if (trendItemsErr) console.error("[admin reportes] trend order_items:", trendItemsErr);
    trendItems = trendItemRows as OrderItemRow[];
    const trendPids = [
      ...new Set(
        trendItems.map((i) => i.product_id).filter((id): id is string => Boolean(id)),
      ),
    ];
    if (trendPids.length > 0) {
      const { data: trendProdData } = await supabase
        .from("products")
        .select("id,price_cents,has_vat,vat_percent")
        .in("id", trendPids);
      for (const p of trendProdData ?? []) {
        trendProductsById.set(p.id as string, p as ProductVatRow);
      }
    }
  }

  const trendByDay = new Map(trendDays.map((d) => [d.key, 0]));
  const paidOrdersPerTrendDay = new Map<string, number>();
  for (const o of orders) {
    if (o.status !== "paid" || typeof o.created_at !== "string") continue;
    const key = reportCalendarDayKeyFromIso(o.created_at);
    if (!trendByDay.has(key)) continue;
    paidOrdersPerTrendDay.set(key, (paidOrdersPerTrendDay.get(key) ?? 0) + 1);
    const { gross } = revenueNetGrossFromLines(o, trendItems, trendProductsById);
    trendByDay.set(key, (trendByDay.get(key) ?? 0) + gross);
  }

  const trend = trendDays.map((d) => ({
    ...d,
    value: trendByDay.get(d.key) ?? 0,
  }));

  const reportIncomeChartPoints: TicketTrendPoint[] = trend.map((t) => {
    const n = paidOrdersPerTrendDay.get(t.key) ?? 0;
    const label = prettyReportDayShortLabel(t.key);
    const detail =
      n === 0
        ? `${label}: sin ventas pagadas`
        : `${label}: ${formatCop(t.value)} con IVA · ${n} venta${n === 1 ? "" : "s"}`;
    return {
      monthKey: t.key,
      labelX: label,
      dayKey: t.key,
      detail,
      avgCents: t.value,
      orderCount: n,
    };
  });

  const maxRaw = Math.max(...trend.map((t) => t.value), 0);

  return (
    <div className="space-y-0">
      <div className="flex flex-col gap-4 pb-8 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4 sm:pb-10">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-rose-950 dark:text-zinc-100 sm:text-2xl md:text-3xl">
            Reportes
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-rose-950/55 dark:text-zinc-400">
            Resumen ejecutivo y métricas de rendimiento de la tienda principal.
          </p>
        </div>
        <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto">
          <ReportsPeriodFilter
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            todayKey={todayKey}
          />
        </div>
      </div>

      <div className="border-t border-rose-200/55 pt-10 pb-12 dark:border-zinc-800">
        <p className={cardLabelClass}>Resumen del periodo</p>
        <p className="mt-1 text-sm text-stone-500 dark:text-zinc-400">{periodLabel}</p>
        <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0">
            <dt className={cardLabelClass}>Total ingresos</dt>
            <dd className="mt-1 text-2xl font-normal tabular-nums text-stone-900 dark:text-zinc-100">
              {formatCop(ingresosConIvaPeriod)}
            </dd>
            <p className="mt-1 text-xs text-stone-500 dark:text-zinc-400">
              {ventasPagadasPeriod} venta{ventasPagadasPeriod === 1 ? "" : "s"} · total con IVA
            </p>
            <div className="mt-3 space-y-1 border-t border-stone-100 pt-3 text-[11px] leading-snug text-stone-500 dark:border-zinc-800 dark:text-zinc-400">
              <p className="tabular-nums">
                <span className="text-stone-400 dark:text-zinc-500">Total sin IVA (base): </span>
                {formatCop(ingresosSinIvaPeriod)}
              </p>
              <p className="tabular-nums">
                <span className="text-stone-400 dark:text-zinc-500">IVA recaudado: </span>
                {formatCop(ivaRecaudadoPeriod)}
              </p>
            </div>
          </div>
          {(
            [
              {
                label: "Efectivo",
                value: formatCop(efectivo),
                hint:
                  totalCobradoPedidos > 0
                    ? `${Math.round((efectivo / totalCobradoPedidos) * 100)}% del cobrado`
                    : "0% del cobrado",
              },
              {
                label: "Transferencia",
                value: formatCop(transferencia),
                hint:
                  totalCobradoPedidos > 0
                    ? `${Math.round((transferencia / totalCobradoPedidos) * 100)}% del cobrado`
                    : "0% del cobrado",
              },
              { label: "Facturas anuladas", value: String(anuladas), hint: "Facturas anuladas" },
              {
                label: "Egresos",
                value: formatCop(egresosPeriod),
                hint: `${cantidadEgresosPeriod} registrados en el periodo`,
              },
            ] as const
          ).map(({ label, value, hint }) => (
            <div key={label} className="min-w-0">
              <dt className={cardLabelClass}>{label}</dt>
              <dd className="mt-1 text-2xl font-normal tabular-nums text-stone-900 dark:text-zinc-100">
                {value}
              </dd>
              <p className="mt-1 text-xs text-stone-500 dark:text-zinc-400">{hint}</p>
            </div>
          ))}

          <div className="min-w-0">
            <dt className={cardLabelClass}>Ganancia</dt>
            <dd className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="inline-flex min-w-0 items-baseline gap-1.5">
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-rose-900/40 dark:text-zinc-500">
                  Bruta
                </span>
                <span className="text-2xl font-normal tabular-nums text-stone-900 dark:text-zinc-100">
                  {formatCop(gananciaBruta)}
                </span>
              </span>
              <span className="inline-flex min-w-0 items-baseline gap-1.5">
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-rose-900/40 dark:text-zinc-500">
                  Neta
                </span>
                <span className="text-sm font-normal tabular-nums text-stone-500 dark:text-zinc-400">
                  {formatCop(gananciaNeta)}
                </span>
              </span>
            </dd>
          </div>

          <div className="min-w-0">
            <dt className={cardLabelClass}>Stock (inversión)</dt>
            <dd className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="inline-flex min-w-0 items-baseline gap-1.5">
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-rose-900/40 dark:text-zinc-500">
                  Sin IVA
                </span>
                <span className="text-2xl font-normal tabular-nums text-stone-900 dark:text-zinc-100">
                  {formatCop(stockInversionNet)}
                </span>
              </span>
              {stockInversionGross > 0 ? (
                <span className="inline-flex min-w-0 items-baseline gap-1.5">
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-rose-900/40 dark:text-zinc-500">
                    Con IVA
                  </span>
                  <span className="text-sm font-normal tabular-nums text-stone-500 dark:text-zinc-400">
                    {formatCop(stockInversionGross)}
                  </span>
                </span>
              ) : null}
            </dd>
            {stockInversionGross === 0 && stockInversionNet > 0 ? (
              <p className="mt-1 text-[11px] leading-snug text-amber-900/80 dark:text-amber-100/80">
                Sin costo con IVA cargado. Completá el campo en cada producto o ejecutá{" "}
                <code className="rounded bg-stone-100 px-1 py-0.5 text-[10px] dark:bg-zinc-800">
                  npm run import:products
                </code>{" "}
                si venís del CSV.
              </p>
            ) : stockInversionGross === 0 && stockInversionNet === 0 && products.length > 0 ? (
              <p className="mt-1 text-[11px] leading-snug text-stone-500 dark:text-zinc-400">
                Con IVA sin monto hasta cargar costo bruto. Si el total sigue en $0, revisá costo
                sin IVA e inventario (bodega + local).
              </p>
            ) : stockInversionGross === 0 && stockInversionNet === 0 && products.length === 0 ? (
              <p className="mt-1 text-[11px] text-stone-400 dark:text-zinc-500">—</p>
            ) : null}
          </div>

          <div className="min-w-0">
            <dt className={cardLabelClass}>Ventas virtuales</dt>
            <dd className="mt-1 text-2xl font-normal tabular-nums text-stone-900 dark:text-zinc-100">
              {formatCop(ventasVirtuales)}
            </dd>
            <p className="mt-1 text-xs text-stone-500 dark:text-zinc-400">
              Checkout web (sin mostrador)
            </p>
          </div>
        </dl>
      </div>

      <section className={`${adminPanelLgClass} mt-10 overflow-hidden`}>
        <div className="px-6 pt-6 pb-3 sm:px-8 sm:pt-8 sm:pb-4">
          <h2 className={sectionTitleClass}>Tendencia de Ingresos</h2>
          <p className="mt-1 max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
            Monto con IVA por día (ventas pagadas) · {periodLabel}
          </p>
        </div>
        <div className="w-full min-w-0">
          <CustomerTicketTrendChart
            points={reportIncomeChartPoints}
            seriesKind="day"
            fillGradientId="reportsIncomeChartFill"
            peakCaption={maxRaw > 0 ? `Máximo del periodo: ${formatCop(maxRaw)}` : undefined}
            secondaryCaption={null}
          />
        </div>
      </section>
    </div>
  );
}
