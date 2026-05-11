import { ReportsPeriodFilter } from "@/components/admin/ReportsPeriodFilter";
import {
  dayInRange,
  dayKeysInclusiveUtc,
  parseReportRangeFromSearchParams,
  prettyReportPeriodLabel,
} from "@/lib/admin-report-range";
import { adminLandingPath } from "@/lib/admin-landing";
import { loadAdminPermissions } from "@/lib/load-admin-permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCop, formatCopCompact } from "@/lib/money";
import {
  revenueNetGrossFromLines,
  sumRevenueNetGrossForOrders,
  type OrderItemRow,
  type OrderRowRef,
  type ProductVatRow,
} from "@/lib/order-revenue-vat";

export const dynamic = "force-dynamic";

const cardLabelClass =
  "text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400 dark:text-zinc-500";

/** Acento del gráfico — mismo eje cromático que login / tienda. */
const chartLineColor = "#1c1917";

function dayKey(dateIso: string) {
  return new Date(dateIso).toISOString().slice(0, 10);
}

function prettyDayLabel(key: string) {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
  });
}

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
  const todayKey = new Date().toISOString().slice(0, 10);
  const { from: rangeFrom, to: rangeTo } = parseReportRangeFromSearchParams(
    sp,
    todayKey,
  );
  const periodLabel = prettyReportPeriodLabel(rangeFrom, rangeTo, todayKey);

  const supabase = await createSupabaseServerClient();
  const [productsRes, ordersRes, expensesRes] = await Promise.all([
    supabase
      .from("products")
      .select("stock_quantity,cost_cents"),
    supabase
      .from("orders")
      .select("id,status,total_cents,created_at,wompi_reference"),
    supabase
      .from("store_expenses")
      .select("id,concept,category,amount_cents,payment_method,notes,expense_date,created_at")
      .gte("expense_date", rangeFrom)
      .lte("expense_date", rangeTo)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const products = productsRes.data ?? [];
  const ordersRaw = ordersRes.data ?? [];
  const expenses = expensesRes.data ?? [];

  const orders = ordersRaw as OrderRowRef[];

  let totalCobradoPedidos = 0;
  let efectivo = 0;
  let transferencia = 0;
  let anuladas = 0;
  let gananciaBruta = 0;
  let ventasVirtuales = 0;
  let ventasPagadasPeriod = 0;
  let egresosPeriod = 0;
  let cantidadEgresosPeriod = 0;

  for (const o of orders) {
    const createdAt = typeof o.created_at === "string" ? o.created_at : null;
    const dk = createdAt ? dayKey(createdAt) : "";
    if (!createdAt || !dayInRange(dk, rangeFrom, rangeTo)) continue;
    const total = Number(o.total_cents ?? 0);
    if (o.status === "paid") {
      ventasPagadasPeriod += 1;
      totalCobradoPedidos += total;
      gananciaBruta += total;
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
      dayInRange(dayKey(o.created_at), rangeFrom, rangeTo),
  );
  const paidPeriodIds = paidPeriodOrders.map((o) => o.id).filter(Boolean);

  let orderItems: OrderItemRow[] = [];
  const productsById = new Map<string, ProductVatRow>();

  if (paidPeriodIds.length > 0) {
    const { data: itemsData } = await supabase
      .from("order_items")
      .select("order_id,product_id,quantity,unit_price_cents")
      .in("order_id", paidPeriodIds);
    orderItems = (itemsData ?? []) as OrderItemRow[];
    const pids = [
      ...new Set(
        orderItems.map((i) => i.product_id).filter((id): id is string => Boolean(id)),
      ),
    ];
    if (pids.length > 0) {
      const { data: prodData } = await supabase
        .from("products")
        .select("id,price_cents,has_vat,vat_percent")
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

  const stockInversion = products.reduce((sum, p) => {
    const cost = Number((p as { cost_cents?: number | null }).cost_cents ?? 0);
    const stock = Number((p as { stock_quantity?: number | null }).stock_quantity ?? 0);
    return sum + cost * stock;
  }, 0);
  const trendDayKeys = dayKeysInclusiveUtc(rangeFrom, rangeTo);
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
        trendKeySet.has(dayKey(o.created_at)),
    )
    .map((o) => o.id);

  let trendItems: OrderItemRow[] = [];
  const trendProductsById = new Map<string, ProductVatRow>();
  if (paidTrendOrderIds.length > 0) {
    const { data: trendItemsData } = await supabase
      .from("order_items")
      .select("order_id,product_id,quantity,unit_price_cents")
      .in("order_id", paidTrendOrderIds);
    trendItems = (trendItemsData ?? []) as OrderItemRow[];
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
  for (const o of orders) {
    if (o.status !== "paid" || typeof o.created_at !== "string") continue;
    const key = dayKey(o.created_at);
    if (!trendByDay.has(key)) continue;
    const { gross } = revenueNetGrossFromLines(o, trendItems, trendProductsById);
    trendByDay.set(key, (trendByDay.get(key) ?? 0) + gross);
  }

  const trend = trendDays.map((d) => ({
    ...d,
    value: trendByDay.get(d.key) ?? 0,
  }));
  const maxRaw = Math.max(...trend.map((t) => t.value), 0);
  const maxTrend = maxRaw > 0 ? maxRaw : 1;
  /** Margen superior para que el pico no toque el borde */
  const yMax = maxTrend * 1.08;

  const xLabelStep =
    trend.length <= 16 ? 1 : Math.max(1, Math.ceil(trend.length / 14));

  const chartW = 920;
  const chartH = 340;
  const padL = 72;
  const padR = 20;
  const padT = 20;
  const padB = 52;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const xAt = (i: number) =>
    padL + (i / Math.max(1, trend.length - 1)) * plotW;
  const yAt = (v: number) => padT + plotH - (v / yMax) * plotH;

  const linePoints = trend.map((t, i) => `${xAt(i)},${yAt(t.value)}`).join(" ");

  const areaPath = `M ${xAt(0)} ${padT + plotH} ${trend
    .map((t, i) => `L ${xAt(i)} ${yAt(t.value)}`)
    .join(" ")} L ${xAt(trend.length - 1)} ${padT + plotH} Z`;

  const gridSteps = 5;
  const yTicks: number[] = [];
  for (let s = 0; s <= gridSteps; s += 1) {
    yTicks.push((yMax * s) / gridSteps);
  }

  return (
    <div className="space-y-0">
      <div className="flex flex-col gap-4 pb-8 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4 sm:pb-10">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-stone-900 dark:text-zinc-100 sm:text-2xl md:text-3xl">
            Reportes
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500 dark:text-zinc-400">
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

      <div className="border-t border-stone-200/80 pt-10 pb-12 dark:border-zinc-800">
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
          {[
            [
              "Efectivo",
              formatCop(efectivo),
              totalCobradoPedidos > 0
                ? `${Math.round((efectivo / totalCobradoPedidos) * 100)}% del cobrado`
                : "0% del cobrado",
            ],
            [
              "Transferencia",
              formatCop(transferencia),
              totalCobradoPedidos > 0
                ? `${Math.round((transferencia / totalCobradoPedidos) * 100)}% del cobrado`
                : "0% del cobrado",
            ],
            ["Facturas anuladas", String(anuladas), "Facturas anuladas"],
            [
              "Egresos",
              formatCop(egresosPeriod),
              `${cantidadEgresosPeriod} registrados en el periodo`,
            ],
            ["Ganancia bruta", formatCop(gananciaBruta), "Por ventas del periodo"],
            ["Stock (inversión)", formatCop(stockInversion), "Inversión en stock"],
            [
              "Ventas virtuales",
              formatCop(ventasVirtuales),
              "Checkout web (sin mostrador)",
            ],
          ].map(([label, value, hint]) => (
            <div key={label} className="min-w-0">
              <dt className={cardLabelClass}>{label}</dt>
              <dd className="mt-1 text-2xl font-normal tabular-nums text-stone-900 dark:text-zinc-100">
                {value}
              </dd>
              <p className="mt-1 text-xs text-stone-500 dark:text-zinc-400">{hint}</p>
            </div>
          ))}
        </dl>
      </div>

      <div className="border-t border-stone-200/80 pt-10 dark:border-zinc-800">
        <h2 className="text-xl font-semibold text-stone-900 dark:text-zinc-100">
          Tendencia de Ingresos
        </h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-zinc-400">
          Monto con IVA por día (ventas pagadas) · {periodLabel}
        </p>
        <div className="mt-6 rounded-2xl border border-stone-200/90 bg-white p-4 shadow-[0_1px_3px_0_rgb(28_25_23/0.06)] dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-[0_1px_0_0_rgb(0_0_0/0.35)] sm:p-6">
          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="h-[280px] w-full min-h-[260px] min-w-[640px] sm:h-[320px]"
              role="img"
              aria-label="Gráfico de ingresos diarios en pesos colombianos"
            >
              <title>Ingresos por día</title>
              <defs>
                <linearGradient
                  id="adminIncomeChartFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={chartLineColor} stopOpacity="0.14" />
                  <stop offset="55%" stopColor={chartLineColor} stopOpacity="0.04" />
                  <stop offset="100%" stopColor={chartLineColor} stopOpacity="0" />
                </linearGradient>
              </defs>

              {yTicks.map((tick, idx) => {
                const y = yAt(tick);
                const isBottom = idx === 0;
                return (
                  <g key={`grid-${idx}`}>
                    {!isBottom ? (
                      <line
                        x1={padL}
                        y1={y}
                        x2={padL + plotW}
                        y2={y}
                        stroke="#e4e4e7"
                        strokeWidth={1}
                        strokeDasharray="4 6"
                      />
                    ) : null}
                    <text
                      x={padL - 10}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-stone-500 dark:fill-zinc-400"
                      style={{ fontSize: "11px" }}
                    >
                      {formatCopCompact(Math.round(tick))}
                    </text>
                  </g>
                );
              })}

              <line
                x1={padL}
                y1={padT + plotH}
                x2={padL + plotW}
                y2={padT + plotH}
                stroke="#d4d4d8"
                strokeWidth={1.25}
              />
              <line
                x1={padL}
                y1={padT}
                x2={padL}
                y2={padT + plotH}
                stroke="#d4d4d8"
                strokeWidth={1.25}
              />

              <path d={areaPath} fill="url(#adminIncomeChartFill)" />
              <polyline
                fill="none"
                stroke={chartLineColor}
                strokeWidth={2.25}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={linePoints}
              />

              {trend.map((t, i) => (
                <g key={t.key}>
                  <title>{`${prettyDayLabel(t.key)}: ${formatCop(t.value)}`}</title>
                  <circle
                    cx={xAt(i)}
                    cy={yAt(t.value)}
                    r="4"
                    className="fill-white dark:fill-zinc-900"
                    stroke={chartLineColor}
                    strokeWidth={2}
                  />
                </g>
              ))}

              {trend.map((t, i) =>
                i % xLabelStep === 0 || i === trend.length - 1 ? (
                  <text
                    key={`xl-${t.key}`}
                    x={xAt(i)}
                    y={chartH - 12}
                    textAnchor="middle"
                    className="fill-stone-600 dark:fill-zinc-400"
                    style={{ fontSize: trend.length > 24 ? "10px" : "12px" }}
                  >
                    {prettyDayLabel(t.key)}
                  </text>
                ) : null,
              )}
            </svg>
          </div>
          {maxRaw > 0 ? (
            <p className="mt-3 text-center text-xs text-stone-400 dark:text-zinc-500">
              Máximo del periodo: {formatCop(maxRaw)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
