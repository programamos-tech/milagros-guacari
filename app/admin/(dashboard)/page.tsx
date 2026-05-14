import { ReportsPeriodFilter } from "@/components/admin/ReportsPeriodFilter";
import { CustomerTicketTrendChart } from "@/components/admin/CustomerTicketTrendChart";
import {
  AnimatedCopCents,
  AnimatedInteger,
} from "@/components/admin/ReportsAnimatedFigures";
import {
  dayInRange,
  dayKeysInclusiveReport,
  parseReportRangeFromSearchParams,
  prettyReportDayShortLabel,
  prettyReportPeriodLabel,
  reportCalendarDayKeyFromIso,
  reportChartDayRange,
  reportDataFetchYmdRange,
  todayYmdInReportStore,
} from "@/lib/admin-report-range";
import { adminPanelLgClass } from "@/lib/admin-ui";
import { adminLandingPath } from "@/lib/admin-landing";
import { loadAdminPermissions } from "@/lib/load-admin-permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
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
  const { chartFrom, chartTo } = reportChartDayRange(rangeTo);
  const { fetchFrom, fetchTo } = reportDataFetchYmdRange(
    rangeFrom,
    rangeTo,
    chartFrom,
    chartTo,
  );

  const supabase = await createSupabaseServerClient();
  const [products, expensesRes] = await Promise.all([
    fetchProductsForStockInvestment(supabase),
    supabase
      .from("store_expenses")
      .select("id,concept,category,amount_cents,payment_method,notes,expense_date,created_at")
      .gte("expense_date", fetchFrom)
      .lte("expense_date", fetchTo)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1500),
  ]);

  const { rows: ordersRaw, error: ordersRangeError } =
    await fetchOrdersCreatedInReportYmdWindow(
      supabase,
      fetchFrom,
      fetchTo,
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
  /** Egresos cuyo medio de pago es efectivo: se restan del total efectivo del periodo. */
  let egresosEfectivoCents = 0;
  /** Egresos en transferencia, tarjeta u otro: se restan del total transferencia/web/mixto. */
  let egresosTransferenciaBucketCents = 0;
  let cantidadEgresosPeriod = 0;
  const expensesByDayCents = new Map<string, number>();

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
  const paidOrderIdsForItems = orders
    .filter((o) => o.status === "paid" && typeof o.created_at === "string")
    .map((o) => o.id)
    .filter(Boolean);

  let orderItems: OrderItemRow[] = [];
  const productsById = new Map<string, ProductVatRow>();

  if (paidOrderIdsForItems.length > 0) {
    const { rows: itemRows, error: itemsErr } = await fetchOrderItemsInChunks(
      supabase,
      paidOrderIdsForItems,
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
    if (!raw) continue;
    const amount = Number(e.amount_cents ?? 0);
    if (dayInRange(raw, chartFrom, chartTo)) {
      expensesByDayCents.set(raw, (expensesByDayCents.get(raw) ?? 0) + amount);
    }
    if (!dayInRange(raw, rangeFrom, rangeTo)) continue;
    egresosPeriod += amount;
    cantidadEgresosPeriod += 1;
    const pm = String(e.payment_method ?? "").trim().toLowerCase();
    if (pm === "efectivo") {
      egresosEfectivoCents += amount;
    } else {
      egresosTransferenciaBucketCents += amount;
    }
  }

  const gananciaNeta = gananciaBruta - egresosPeriod;

  const efectivoNetoCaja = efectivo - egresosEfectivoCents;
  const transferenciaNeta = transferencia - egresosTransferenciaBucketCents;

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
  const trendDayKeys = dayKeysInclusiveReport(chartFrom, chartTo);
  const trendDays: { key: string; value: number }[] = trendDayKeys.map((key) => ({
    key,
    value: 0,
  }));

  const trendByDay = new Map(trendDays.map((d) => [d.key, 0]));
  const paidOrdersPerTrendDay = new Map<string, number>();
  const paidOrdersForChart = orders.filter(
    (o) =>
      o.status === "paid" &&
      typeof o.created_at === "string" &&
      dayInRange(reportCalendarDayKeyFromIso(o.created_at), chartFrom, chartTo),
  );
  for (const o of paidOrdersForChart) {
    const key = reportCalendarDayKeyFromIso(o.created_at);
    if (!trendByDay.has(key)) continue;
    paidOrdersPerTrendDay.set(key, (paidOrdersPerTrendDay.get(key) ?? 0) + 1);
    const { gross } = revenueNetGrossFromLines(o, orderItems, productsById);
    trendByDay.set(key, (trendByDay.get(key) ?? 0) + gross);
  }

  const trend = trendDays.map((d) => ({
    ...d,
    value: trendByDay.get(d.key) ?? 0,
  }));

  let peakIncomeDayKey: string | null = null;
  let peakIncomeDayCents = 0;
  for (const row of trend) {
    if (row.value > peakIncomeDayCents) {
      peakIncomeDayCents = row.value;
      peakIncomeDayKey = row.key;
    }
  }

  const reportIncomeChartPoints: TicketTrendPoint[] = trend.map((t) => {
    const n = paidOrdersPerTrendDay.get(t.key) ?? 0;
    const label = prettyReportDayShortLabel(t.key);
    const eg = expensesByDayCents.get(t.key) ?? 0;
    const detail = `${label}: ${formatCop(t.value)} ingresos (IVA, ventas pagadas) · ${formatCop(eg)} egresos`;
    return {
      monthKey: t.key,
      labelX: label,
      dayKey: t.key,
      detail,
      avgCents: t.value,
      orderCount: n,
      expenseCents: eg,
    };
  });

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

      <div
        key={`reports-body-${rangeFrom}-${rangeTo}`}
        className="border-t border-rose-200/55 pt-10 pb-12 dark:border-zinc-800"
      >
        <p className={cardLabelClass}>Resumen del periodo</p>
        <p className="mt-1 text-sm text-stone-500 dark:text-zinc-400">{periodLabel}</p>
        <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          <div
            className="reports-metric-card min-w-0"
            style={{ ["--reports-stagger" as string]: "0ms" }}
          >
            <dt className={cardLabelClass}>Total ingresos</dt>
            <dd className="mt-1 text-2xl font-normal tabular-nums text-stone-900 dark:text-zinc-100">
              <AnimatedCopCents cents={ingresosConIvaPeriod} delay={40} />
            </dd>
            <p className="mt-1 text-xs text-stone-500 dark:text-zinc-400">
              {ventasPagadasPeriod} venta{ventasPagadasPeriod === 1 ? "" : "s"} · total con IVA
            </p>
            <div className="mt-3 space-y-1 border-t border-stone-100 pt-3 text-[11px] leading-snug text-stone-500 dark:border-zinc-800 dark:text-zinc-400">
              <p className="tabular-nums">
                <span className="text-stone-400 dark:text-zinc-500">Total sin IVA (base): </span>
                <AnimatedCopCents cents={ingresosSinIvaPeriod} delay={180} duration={750} />
              </p>
              <p className="tabular-nums">
                <span className="text-stone-400 dark:text-zinc-500">IVA recaudado: </span>
                <AnimatedCopCents cents={ivaRecaudadoPeriod} delay={260} duration={750} />
              </p>
            </div>
          </div>
          {(
            [
              {
                label: "Efectivo",
                cents: efectivoNetoCaja,
                centsClassName:
                  efectivoNetoCaja < 0 ? "text-red-700 dark:text-red-300" : undefined,
                hint:
                  totalCobradoPedidos > 0
                    ? `${Math.round((efectivo / totalCobradoPedidos) * 100)}% cobrado en efectivo${
                        egresosEfectivoCents > 0
                          ? ` · menos ${formatCop(egresosEfectivoCents)} egresos en efectivo`
                          : ""
                      }`
                    : egresosEfectivoCents > 0
                      ? `Solo egresos en efectivo: ${formatCop(egresosEfectivoCents)}`
                      : "Sin cobros POS en efectivo en el periodo",
                staggerMs: 70,
              },
              {
                label: "Transferencia",
                cents: transferenciaNeta,
                centsClassName:
                  transferenciaNeta < 0 ? "text-red-700 dark:text-red-300" : undefined,
                hint:
                  totalCobradoPedidos > 0
                    ? `${Math.round((transferencia / totalCobradoPedidos) * 100)}% del cobrado`
                    : egresosTransferenciaBucketCents > 0
                      ? `Solo egresos: ${formatCop(egresosTransferenciaBucketCents)}`
                      : "Sin cobros en este bucket en el periodo",
                staggerMs: 135,
              },
              {
                label: "Facturas anuladas",
                count: anuladas,
                hint: "Facturas anuladas",
                staggerMs: 200,
              },
              {
                label: "Egresos",
                cents: egresosPeriod,
                hint: `${cantidadEgresosPeriod} registrados en el periodo`,
                staggerMs: 265,
              },
            ] as const
          ).map((item) => (
            <div
              key={item.label}
              className="reports-metric-card min-w-0"
              style={{ ["--reports-stagger" as string]: `${item.staggerMs}ms` }}
            >
              <dt className={cardLabelClass}>{item.label}</dt>
              <dd className="mt-1 text-2xl font-normal tabular-nums text-stone-900 dark:text-zinc-100">
                {"cents" in item ? (
                  <AnimatedCopCents
                    cents={item.cents}
                    delay={item.staggerMs + 50}
                    className={"centsClassName" in item ? item.centsClassName : undefined}
                  />
                ) : (
                  <AnimatedInteger value={item.count} delay={item.staggerMs + 50} />
                )}
              </dd>
              <p className="mt-1 text-xs text-stone-500 dark:text-zinc-400">{item.hint}</p>
            </div>
          ))}

          <div
            className="reports-metric-card min-w-0"
            style={{ ["--reports-stagger" as string]: "330ms" }}
          >
            <dt className={cardLabelClass}>Ganancia</dt>
            <dd className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="inline-flex min-w-0 items-baseline gap-1.5">
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-rose-900/40 dark:text-zinc-500">
                  Bruta
                </span>
                <span className="text-2xl font-normal tabular-nums text-stone-900 dark:text-zinc-100">
                  <AnimatedCopCents cents={gananciaBruta} delay={380} />
                </span>
              </span>
              <span className="inline-flex min-w-0 items-baseline gap-1.5">
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-rose-900/40 dark:text-zinc-500">
                  Neta
                </span>
                <span className="text-sm font-normal tabular-nums text-stone-500 dark:text-zinc-400">
                  <AnimatedCopCents cents={gananciaNeta} delay={460} duration={850} />
                </span>
              </span>
            </dd>
          </div>

          <div
            className="reports-metric-card min-w-0"
            style={{ ["--reports-stagger" as string]: "395ms" }}
          >
            <dt className={cardLabelClass}>Stock (inversión)</dt>
            <dd className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="inline-flex min-w-0 items-baseline gap-1.5">
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-rose-900/40 dark:text-zinc-500">
                  Sin IVA
                </span>
                <span className="text-2xl font-normal tabular-nums text-stone-900 dark:text-zinc-100">
                  <AnimatedCopCents cents={stockInversionNet} delay={440} />
                </span>
              </span>
              {stockInversionGross > 0 ? (
                <span className="inline-flex min-w-0 items-baseline gap-1.5">
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-rose-900/40 dark:text-zinc-500">
                    Con IVA
                  </span>
                  <span className="text-sm font-normal tabular-nums text-stone-500 dark:text-zinc-400">
                    <AnimatedCopCents cents={stockInversionGross} delay={520} duration={850} />
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

          <div
            className="reports-metric-card min-w-0"
            style={{ ["--reports-stagger" as string]: "460ms" }}
          >
            <dt className={cardLabelClass}>Ventas virtuales</dt>
            <dd className="mt-1 text-2xl font-normal tabular-nums text-stone-900 dark:text-zinc-100">
              <AnimatedCopCents cents={ventasVirtuales} delay={510} />
            </dd>
            <p className="mt-1 text-xs text-stone-500 dark:text-zinc-400">
              Checkout web (sin mostrador)
            </p>
          </div>
        </dl>
      </div>

      <section
        key={`reports-chart-${rangeFrom}-${rangeTo}`}
        className={`reports-chart-reveal ${adminPanelLgClass} mt-10 overflow-hidden`}
        style={{ ["--reports-chart-delay" as string]: "520ms" }}
      >
        <div className="px-6 pt-6 pb-3 sm:px-8 sm:pt-8 sm:pb-4">
          <h2 className={sectionTitleClass}>Ingresos y egresos por día</h2>
          <p className="mt-1 max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
            Las tarjetas de arriba usan el periodo del filtro ({periodLabel}). Esta curva muestra siempre{" "}
            <span className="font-medium text-zinc-600 dark:text-zinc-300">7 días</span> calendario
            terminando en el último día del filtro ({prettyReportDayShortLabel(chartTo)}). Ingresos por
            día de la venta; egresos por{" "}
            <span className="font-medium text-zinc-600 dark:text-zinc-300">fecha del egreso</span>.
          </p>
        </div>
        <div className="w-full min-w-0">
          <CustomerTicketTrendChart
            points={reportIncomeChartPoints}
            seriesKind="day"
            fillGradientId="reportsIncomeChartFill"
            secondaryCaption={null}
          />
        </div>
        <div className="border-t border-zinc-100/90 px-6 py-4 text-xs leading-relaxed text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 sm:px-8">
          <p>
            Los ingresos de la curva usan la misma fórmula que el total con IVA (líneas del pedido), pero
            repartidos en los 7 días del gráfico. Las tarjetas del resumen solo cuentan el periodo del
            filtro; si elegís un solo día, el total de ingresos no coincide con la suma de la curva. Un
            día muy alto suele ser importación o muchas ventas con la misma fecha de creación.
          </p>
          {peakIncomeDayKey && peakIncomeDayCents > 0 ? (
            <p className="mt-2">
              <Link
                href={`/admin/ventas?from=${encodeURIComponent(peakIncomeDayKey)}&to=${encodeURIComponent(peakIncomeDayKey)}`}
                className="font-medium text-rose-900 underline decoration-rose-900/35 underline-offset-2 hover:text-rose-950 dark:text-rose-200 dark:decoration-rose-200/40 dark:hover:text-rose-100"
              >
                Ver ventas del {prettyReportDayShortLabel(peakIncomeDayKey)}
              </Link>
              <span className="text-zinc-400 dark:text-zinc-500">
                {" "}
                · pico del gráfico {formatCop(peakIncomeDayCents)}
              </span>
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
