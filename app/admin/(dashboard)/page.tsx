import { ReportsPeriodFilter } from "@/components/admin/ReportsPeriodFilter";
import { ReportLiquidityMetricCards } from "@/components/admin/ReportLiquidityMetricCards";
import { CustomerTicketTrendChart } from "@/components/admin/CustomerTicketTrendChart";
import {
  StaticCopCents,
  StaticInteger,
} from "@/components/admin/ReportsAnimatedFigures";
import {
  parseReportRangeFromSearchParams,
  prettyReportDayShortLabel,
  prettyReportPeriodLabel,
  reportChartDayRange,
  reportDataFetchYmdRange,
  todayYmdInReportStore,
} from "@/lib/admin-report-range";
import { fetchAdminReportDashboardData } from "@/lib/admin-reports-data";
import { adminPanelLgClass } from "@/lib/admin-ui";
import { adminLandingPath } from "@/lib/admin-landing";
import { loadAdminPermissions } from "@/lib/load-admin-permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatCop } from "@/lib/money";

export const dynamic = "force-dynamic";

const cardLabelClass =
  "text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-900/40 dark:text-zinc-500";

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
  const report = await fetchAdminReportDashboardData(supabase, {
    rangeFrom,
    rangeTo,
    chartFrom,
    chartTo,
    fetchFrom,
    fetchTo,
    periodLabel,
  });

  if (report.ordersRangeError) {
    console.error("[admin reportes] orders:", report.ordersRangeError);
  }

  const {
    ingresosSinIvaPeriod,
    ingresosConIvaPeriod,
    ivaRecaudadoPeriod,
    gananciaBruta,
    gananciaNeta,
    totalCobradoPedidos,
    efectivo,
    transferencia,
    anuladas,
    ventasVirtuales,
    ventasPagadasPeriod,
    egresosPeriod,
    egresosEfectivoCents,
    egresosTransferenciaBucketCents,
    cantidadEgresosPeriod,
    efectivoNetoCaja,
    transferenciaNeta,
    reportExpensesEfectivoLines,
    reportExpensesOtrosLines,
    reportIncomeChartPoints,
    peakIncomeDayKey,
    peakIncomeDayCents,
    stockInversionNet,
    stockInversionGross,
    stockHasProducts,
    stockHasGrossCost,
    revenueApproxFromOrderTotals,
  } = report;

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
        className="border-t border-rose-200/55 pt-10 pb-4 dark:border-zinc-800"
      >
        <p className={cardLabelClass}>Resumen del periodo</p>
        <p className="mt-1 text-sm text-stone-500 dark:text-zinc-400">{periodLabel}</p>
        {revenueApproxFromOrderTotals ? (
          <p className="mt-2 max-w-3xl text-[11px] leading-snug text-amber-900/85 dark:text-amber-100/85">
            Periodo largo: ingresos, IVA y ganancia se calculan desde el total del pedido (más
            rápido). Para desglose línea a línea, elegí un rango de hasta 31 días.
          </p>
        ) : null}
        <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          <div
            className="reports-metric-card min-w-0"
            style={{ ["--reports-stagger" as string]: "0ms" }}
          >
            <dt className={cardLabelClass}>Total ingresos</dt>
            <dd className="mt-1 text-2xl font-normal tabular-nums text-stone-900 dark:text-zinc-100">
              <StaticCopCents cents={ingresosConIvaPeriod} />
            </dd>
            <p className="mt-1 text-xs text-stone-500 dark:text-zinc-400">
              {ventasPagadasPeriod} venta{ventasPagadasPeriod === 1 ? "" : "s"} · total con IVA
            </p>
            <div className="mt-3 space-y-1 border-t border-stone-100 pt-3 text-[11px] leading-snug text-stone-500 dark:border-zinc-800 dark:text-zinc-400">
              <p className="tabular-nums">
                <span className="text-stone-400 dark:text-zinc-500">Total sin IVA (base): </span>
                <StaticCopCents cents={ingresosSinIvaPeriod} />
              </p>
              <p className="tabular-nums">
                <span className="text-stone-400 dark:text-zinc-500">IVA recaudado: </span>
                <StaticCopCents cents={ivaRecaudadoPeriod} />
              </p>
            </div>
          </div>
          <ReportLiquidityMetricCards
            cardLabelClass={cardLabelClass}
            periodLabel={periodLabel}
            totalCobradoPedidos={totalCobradoPedidos}
            efectivo={efectivo}
            efectivoNetoCaja={efectivoNetoCaja}
            egresosEfectivoCents={egresosEfectivoCents}
            expensesEfectivo={reportExpensesEfectivoLines}
            transferencia={transferencia}
            transferenciaNeta={transferenciaNeta}
            egresosTransferenciaBucketCents={egresosTransferenciaBucketCents}
            expensesOtros={reportExpensesOtrosLines}
          />
          {(
            [
              {
                label: "Facturas anuladas",
                count: anuladas,
                hint: "Facturas anuladas",
                staggerMs: 80,
              },
              {
                label: "Egresos",
                cents: egresosPeriod,
                hint: `${cantidadEgresosPeriod} registrados en el periodo`,
                staggerMs: 120,
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
                  <StaticCopCents cents={item.cents} />
                ) : (
                  <StaticInteger value={item.count} />
                )}
              </dd>
              <p className="mt-1 text-xs text-stone-500 dark:text-zinc-400">{item.hint}</p>
            </div>
          ))}

          <div
            className="reports-metric-card min-w-0"
            style={{ ["--reports-stagger" as string]: "160ms" }}
          >
            <dt className={cardLabelClass}>Ganancia</dt>
            <dd className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="inline-flex min-w-0 items-baseline gap-1.5">
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-rose-900/40 dark:text-zinc-500">
                  Bruta
                </span>
                <span className="text-2xl font-normal tabular-nums text-stone-900 dark:text-zinc-100">
                  <StaticCopCents cents={gananciaBruta} />
                </span>
              </span>
              <span className="inline-flex min-w-0 items-baseline gap-1.5">
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-rose-900/40 dark:text-zinc-500">
                  Neta
                </span>
                <span className="text-sm font-normal tabular-nums text-stone-500 dark:text-zinc-400">
                  <StaticCopCents cents={gananciaNeta} />
                </span>
              </span>
            </dd>
          </div>

          <div
            className="reports-metric-card min-w-0"
            style={{ ["--reports-stagger" as string]: "200ms" }}
          >
            <dt className={cardLabelClass}>Stock (inversión)</dt>
            <dd className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="inline-flex min-w-0 items-baseline gap-1.5">
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-rose-900/40 dark:text-zinc-500">
                  Sin IVA
                </span>
                <span className="text-2xl font-normal tabular-nums text-stone-900 dark:text-zinc-100">
                  <StaticCopCents cents={stockInversionNet} />
                </span>
              </span>
              {stockInversionGross > 0 ? (
                <span className="inline-flex min-w-0 items-baseline gap-1.5">
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-rose-900/40 dark:text-zinc-500">
                    Con IVA
                  </span>
                  <span className="text-sm font-normal tabular-nums text-stone-500 dark:text-zinc-400">
                    <StaticCopCents cents={stockInversionGross} />
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
            ) : stockInversionGross === 0 && stockInversionNet === 0 && stockHasProducts ? (
              <p className="mt-1 text-[11px] leading-snug text-stone-500 dark:text-zinc-400">
                Con IVA sin monto hasta cargar costo bruto. Si el total sigue en $0, revisá costo
                sin IVA e inventario (bodega + local).
              </p>
            ) : stockInversionGross === 0 && stockInversionNet === 0 && !stockHasProducts ? (
              <p className="mt-1 text-[11px] text-stone-400 dark:text-zinc-500">—</p>
            ) : null}
          </div>

          <div
            className="reports-metric-card min-w-0"
            style={{ ["--reports-stagger" as string]: "240ms" }}
          >
            <dt className={cardLabelClass}>Ventas virtuales</dt>
            <dd className="mt-1 text-2xl font-normal tabular-nums text-stone-900 dark:text-zinc-100">
              <StaticCopCents cents={ventasVirtuales} />
            </dd>
            <p className="mt-1 text-xs text-stone-500 dark:text-zinc-400">
              Checkout web (sin mostrador)
            </p>
          </div>
        </dl>
      </div>

      <section
        key={`reports-chart-${rangeFrom}-${rangeTo}`}
        className={`reports-chart-reveal ${adminPanelLgClass} mt-6 overflow-hidden`}
        style={{ ["--reports-chart-delay" as string]: "520ms" }}
      >
        <div className="px-6 pt-4 pb-2 sm:px-8 sm:pt-5 sm:pb-3">
          <h2 className={sectionTitleClass}>Ingresos y egresos por día</h2>
          <p className="mt-1 w-full text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
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
