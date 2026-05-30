import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReportExpenseDetailLine } from "@/components/admin/ReportLiquidityMetricCards";
import {
  dayKeysInclusiveReport,
  prettyReportDayShortLabel,
  REPORT_LINE_DETAIL_MAX_DAYS,
  reportRangeDayCountInclusive,
} from "@/lib/admin-report-range";
import { fetchOrderItemsInChunks } from "@/lib/admin-fetch-orders-for-report";
import { formatCop } from "@/lib/money";
import type { TicketTrendPoint } from "@/lib/customer-ticket-trend";
import {
  sumGrossProfitNetOnLinesForPaidOrders,
  sumRevenueNetGrossForOrders,
  type OrderItemRow,
  type OrderRowRef,
  type ProductVatRow,
} from "@/lib/order-revenue-vat";

export type AdminReportDashboardData = {
  periodLabel: string;
  rangeFrom: string;
  rangeTo: string;
  chartFrom: string;
  chartTo: string;
  stockInversionNet: number;
  stockInversionGross: number;
  stockHasProducts: boolean;
  stockHasGrossCost: boolean;
  ingresosSinIvaPeriod: number;
  ingresosConIvaPeriod: number;
  ivaRecaudadoPeriod: number;
  gananciaBruta: number;
  gananciaNeta: number;
  totalCobradoPedidos: number;
  efectivo: number;
  transferencia: number;
  anuladas: number;
  ventasVirtuales: number;
  ventasPagadasPeriod: number;
  egresosPeriod: number;
  egresosEfectivoCents: number;
  egresosTransferenciaBucketCents: number;
  cantidadEgresosPeriod: number;
  efectivoNetoCaja: number;
  transferenciaNeta: number;
  reportExpensesEfectivoLines: ReportExpenseDetailLine[];
  reportExpensesOtrosLines: ReportExpenseDetailLine[];
  reportIncomeChartPoints: TicketTrendPoint[];
  peakIncomeDayKey: string | null;
  peakIncomeDayCents: number;
  ordersRangeError: string | null;
  revenueApproxFromOrderTotals: boolean;
};

function revenueNetGrossFromOrderTotals(orders: OrderRowRef[]): {
  net: number;
  gross: number;
} {
  let gross = 0;
  for (const o of orders) {
    if (o.status !== "paid") continue;
    gross += Math.max(0, Math.round(Number(o.total_cents ?? 0)));
  }
  return { net: gross, gross };
}

async function fetchStockInvestmentTotals(supabase: SupabaseClient): Promise<{
  netCents: number;
  grossCents: number;
  productCount: number;
}> {
  const { data, error } = await supabase.rpc("admin_stock_investment_totals");
  if (!error && data?.length) {
    const row = data[0] as { net_cents?: number; gross_cents?: number };
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true });
    return {
      netCents: Number(row.net_cents ?? 0),
      grossCents: Number(row.gross_cents ?? 0),
      productCount: count ?? 0,
    };
  }

  const { data: products } = await supabase
    .from("products")
    .select("stock_quantity,cost_cents");
  const rows = products ?? [];
  let netCents = 0;
  for (const p of rows) {
    const stock = Number((p as { stock_quantity?: number }).stock_quantity ?? 0);
    const cost = Number((p as { cost_cents?: number }).cost_cents ?? 0);
    netCents += cost * stock;
  }
  return { netCents, grossCents: netCents, productCount: rows.length };
}

function parseRpcExpenseLines(raw: unknown): ReportExpenseDetailLine[] {
  if (!Array.isArray(raw)) return [];
  const out: ReportExpenseDetailLine[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    out.push({
      id: String(r.id ?? ""),
      concept: String(r.concept ?? ""),
      amount_cents: Number(r.amount_cents ?? 0),
      expense_date: String(r.expense_date ?? ""),
      payment_method: String(r.payment_method ?? ""),
      category: r.category != null ? String(r.category) : null,
      created_at: typeof r.created_at === "string" ? r.created_at : null,
    });
  }
  return out;
}

function splitExpenseLines(lines: ReportExpenseDetailLine[]): {
  efectivo: ReportExpenseDetailLine[];
  otros: ReportExpenseDetailLine[];
} {
  const efectivo: ReportExpenseDetailLine[] = [];
  const otros: ReportExpenseDetailLine[] = [];
  for (const line of lines) {
    if (line.payment_method.trim().toLowerCase() === "efectivo") {
      efectivo.push(line);
    } else {
      otros.push(line);
    }
  }
  return { efectivo, otros };
}

async function fetchPaidOrdersForRevenue(
  supabase: SupabaseClient,
  paidOrderIds: string[],
): Promise<OrderRowRef[]> {
  if (paidOrderIds.length === 0) return [];
  const out: OrderRowRef[] = [];
  for (let i = 0; i < paidOrderIds.length; i += 120) {
    const part = paidOrderIds.slice(i, i + 120);
    const { data, error } = await supabase
      .from("orders")
      .select("id,status,total_cents,created_at,wompi_reference")
      .in("id", part);
    if (error) {
      console.error("[admin reportes] orders by id:", error.message);
      break;
    }
    out.push(...((data ?? []) as OrderRowRef[]));
  }
  return out;
}

async function fetchLineDetailForOrders(
  supabase: SupabaseClient,
  paidPeriodOrders: OrderRowRef[],
): Promise<{
  orderItems: OrderItemRow[];
  productsById: Map<string, ProductVatRow>;
}> {
  const paidOrderIds = paidPeriodOrders.map((o) => o.id).filter(Boolean);
  if (paidOrderIds.length === 0) {
    return { orderItems: [], productsById: new Map() };
  }

  const { rows: itemRows, error: itemsErr } = await fetchOrderItemsInChunks(
    supabase,
    paidOrderIds,
    "order_id,product_id,quantity,unit_price_cents",
  );
  if (itemsErr) console.error("[admin reportes] order_items:", itemsErr);
  const orderItems = itemRows as OrderItemRow[];

  const productsById = new Map<string, ProductVatRow>();
  const pids = [
    ...new Set(
      orderItems.map((i) => i.product_id).filter((id): id is string => Boolean(id)),
    ),
  ];
  for (let i = 0; i < pids.length; i += 120) {
    const part = pids.slice(i, i + 120);
    const { data: prodData } = await supabase
      .from("products")
      .select("id,price_cents,has_vat,vat_percent,cost_cents")
      .in("id", part);
    for (const p of prodData ?? []) {
      productsById.set(p.id as string, p as ProductVatRow);
    }
  }

  return { orderItems, productsById };
}

function buildChartPointsFromRpc(
  chartFrom: string,
  chartTo: string,
  chartPointsRaw: unknown,
  expensesByChartDayRaw: unknown,
): {
  points: TicketTrendPoint[];
  peakIncomeDayKey: string | null;
  peakIncomeDayCents: number;
} {
  const incomeByDay = new Map<string, { income: number; count: number }>();
  if (Array.isArray(chartPointsRaw)) {
    for (const row of chartPointsRaw) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const dayKey = String(r.day_key ?? "");
      if (!dayKey) continue;
      incomeByDay.set(dayKey, {
        income: Number(r.income_cents ?? 0),
        count: Number(r.order_count ?? 0),
      });
    }
  }

  const expensesByDay = new Map<string, number>();
  if (expensesByChartDayRaw && typeof expensesByChartDayRaw === "object") {
    for (const [key, value] of Object.entries(
      expensesByChartDayRaw as Record<string, unknown>,
    )) {
      expensesByDay.set(key, Number(value ?? 0));
    }
  }

  let peakIncomeDayKey: string | null = null;
  let peakIncomeDayCents = 0;
  const points: TicketTrendPoint[] = dayKeysInclusiveReport(chartFrom, chartTo).map(
    (key) => {
      const income = incomeByDay.get(key);
      const value = income?.income ?? 0;
      const n = income?.count ?? 0;
      if (value > peakIncomeDayCents) {
        peakIncomeDayCents = value;
        peakIncomeDayKey = key;
      }
      const label = prettyReportDayShortLabel(key);
      const eg = expensesByDay.get(key) ?? 0;
      return {
        monthKey: key,
        labelX: label,
        dayKey: key,
        detail: `${label}: ${formatCop(value)} ingresos (IVA, ventas pagadas) · ${formatCop(eg)} egresos`,
        avgCents: value,
        orderCount: n,
        expenseCents: eg,
      };
    },
  );

  return { points, peakIncomeDayKey, peakIncomeDayCents };
}

async function fetchAdminReportViaRpc(
  supabase: SupabaseClient,
  opts: {
    rangeFrom: string;
    rangeTo: string;
    chartFrom: string;
    chartTo: string;
    fetchFrom: string;
    fetchTo: string;
    periodLabel: string;
  },
): Promise<AdminReportDashboardData | null> {
  const { rangeFrom, rangeTo, chartFrom, chartTo, fetchFrom, fetchTo, periodLabel } =
    opts;

  const [stockTotals, rpcRes] = await Promise.all([
    fetchStockInvestmentTotals(supabase),
    supabase.rpc("admin_report_dashboard_agg", {
      p_fetch_from: fetchFrom,
      p_fetch_to: fetchTo,
      p_range_from: rangeFrom,
      p_range_to: rangeTo,
      p_chart_from: chartFrom,
      p_chart_to: chartTo,
    }),
  ]);

  if (rpcRes.error || !rpcRes.data || typeof rpcRes.data !== "object") {
    if (rpcRes.error) {
      console.error("[admin reportes] admin_report_dashboard_agg:", rpcRes.error.message);
    }
    return null;
  }

  const d = rpcRes.data as Record<string, unknown>;
  const periodDayCount = reportRangeDayCountInclusive(rangeFrom, rangeTo);
  const needsLineDetailForPeriod = periodDayCount <= REPORT_LINE_DETAIL_MAX_DAYS;
  const revenueApproxFromOrderTotals = !needsLineDetailForPeriod;

  const paidOrderIds = Array.isArray(d.paidOrderIds)
    ? d.paidOrderIds.map((id) => String(id)).filter(Boolean)
    : [];

  let ingresosSinIvaPeriod = 0;
  let ingresosConIvaPeriod = 0;
  let gananciaBruta = 0;

  if (needsLineDetailForPeriod && paidOrderIds.length > 0) {
    const paidPeriodOrders = await fetchPaidOrdersForRevenue(supabase, paidOrderIds);
    const { orderItems, productsById } = await fetchLineDetailForOrders(
      supabase,
      paidPeriodOrders,
    );
    const rev = sumRevenueNetGrossForOrders(
      paidPeriodOrders,
      orderItems,
      productsById,
    );
    ingresosSinIvaPeriod = rev.net;
    ingresosConIvaPeriod = rev.gross;
    gananciaBruta = sumGrossProfitNetOnLinesForPaidOrders(
      paidPeriodOrders,
      orderItems,
      productsById,
    );
  } else if (paidOrderIds.length > 0) {
    const paidPeriodOrders = await fetchPaidOrdersForRevenue(supabase, paidOrderIds);
    const rev = revenueNetGrossFromOrderTotals(paidPeriodOrders);
    ingresosSinIvaPeriod = rev.net;
    ingresosConIvaPeriod = rev.gross;
    gananciaBruta = 0;
  }

  const ivaRecaudadoPeriod = Math.max(
    0,
    ingresosConIvaPeriod - ingresosSinIvaPeriod,
  );

  const expenseLines = parseRpcExpenseLines(d.expenseLines);
  const { efectivo: reportExpensesEfectivoLines, otros: reportExpensesOtrosLines } =
    splitExpenseLines(expenseLines);

  const egresosPeriod = Number(d.egresosPeriod ?? 0);
  const egresosEfectivoCents = Number(d.egresosEfectivoCents ?? 0);
  const egresosTransferenciaBucketCents = Number(
    d.egresosTransferenciaBucketCents ?? 0,
  );
  const gananciaNeta = gananciaBruta - egresosPeriod;
  const efectivo = Number(d.efectivo ?? 0);
  const transferencia = Number(d.transferencia ?? 0);
  const efectivoNetoCaja = efectivo - egresosEfectivoCents;
  const transferenciaNeta = transferencia - egresosTransferenciaBucketCents;

  const { points, peakIncomeDayKey, peakIncomeDayCents } = buildChartPointsFromRpc(
    chartFrom,
    chartTo,
    d.chartPoints,
    d.expensesByChartDay,
  );

  return {
    periodLabel,
    rangeFrom,
    rangeTo,
    chartFrom,
    chartTo,
    stockInversionNet: stockTotals.netCents,
    stockInversionGross: stockTotals.grossCents,
    stockHasProducts: stockTotals.productCount > 0,
    stockHasGrossCost: stockTotals.grossCents > 0,
    ingresosSinIvaPeriod,
    ingresosConIvaPeriod,
    ivaRecaudadoPeriod,
    gananciaBruta,
    gananciaNeta,
    totalCobradoPedidos: Number(d.totalCobradoPedidos ?? 0),
    efectivo,
    transferencia,
    anuladas: Number(d.anuladas ?? 0),
    ventasVirtuales: Number(d.ventasVirtuales ?? 0),
    ventasPagadasPeriod: Number(d.ventasPagadasPeriod ?? 0),
    egresosPeriod,
    egresosEfectivoCents,
    egresosTransferenciaBucketCents,
    cantidadEgresosPeriod: Number(d.cantidadEgresosPeriod ?? 0),
    efectivoNetoCaja,
    transferenciaNeta,
    reportExpensesEfectivoLines,
    reportExpensesOtrosLines,
    reportIncomeChartPoints: points,
    peakIncomeDayKey,
    peakIncomeDayCents,
    ordersRangeError: null,
    revenueApproxFromOrderTotals,
  };
}

export async function fetchAdminReportDashboardData(
  supabase: SupabaseClient,
  opts: {
    rangeFrom: string;
    rangeTo: string;
    chartFrom: string;
    chartTo: string;
    fetchFrom: string;
    fetchTo: string;
    periodLabel: string;
  },
): Promise<AdminReportDashboardData> {
  const viaRpc = await fetchAdminReportViaRpc(supabase, opts);
  if (viaRpc) return viaRpc;

  throw new Error(
    "No se pudieron cargar los reportes. Reintentá en unos segundos o contactá soporte.",
  );
}
