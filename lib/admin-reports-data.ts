import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReportExpenseDetailLine } from "@/components/admin/ReportLiquidityMetricCards";
import {
  dayInRange,
  dayKeysInclusiveReport,
  prettyReportDayShortLabel,
  reportCalendarDayKeyFromIso,
  REPORT_LINE_DETAIL_MAX_DAYS,
  reportRangeDayCountInclusive,
} from "@/lib/admin-report-range";
import { fetchOrderItemsInChunks, fetchOrdersCreatedInReportYmdWindow } from "@/lib/admin-fetch-orders-for-report";
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
  /** Ingresos/ganancia del periodo usaron `total_cents` (rango > {@link REPORT_LINE_DETAIL_MAX_DAYS} días). */
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
    .select("stock_quantity,cost_cents,cost_gross_cents");
  const rows = products ?? [];
  let netCents = 0;
  let grossCents = 0;
  for (const p of rows) {
    const stock = Number((p as { stock_quantity?: number }).stock_quantity ?? 0);
    const cost = Number((p as { cost_cents?: number }).cost_cents ?? 0);
    const gross = Number(
      (p as { cost_gross_cents?: number }).cost_gross_cents ?? cost,
    );
    netCents += cost * stock;
    grossCents += gross * stock;
  }
  return { netCents, grossCents, productCount: rows.length };
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
  const { rangeFrom, rangeTo, chartFrom, chartTo, fetchFrom, fetchTo, periodLabel } =
    opts;

  const [stockTotals, expensesRes, ordersResult] = await Promise.all([
    fetchStockInvestmentTotals(supabase),
    supabase
      .from("store_expenses")
      .select(
        "id,concept,category,amount_cents,payment_method,notes,expense_date,created_at,is_cancelled",
      )
      .gte("expense_date", fetchFrom)
      .lte("expense_date", fetchTo)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1500),
    fetchOrdersCreatedInReportYmdWindow(
      supabase,
      fetchFrom,
      fetchTo,
      "id,status,total_cents,created_at,wompi_reference",
    ),
  ]);

  const expenses = expensesRes.data ?? [];
  const orders = (ordersResult.rows ?? []) as OrderRowRef[];

  let totalCobradoPedidos = 0;
  let efectivo = 0;
  let transferencia = 0;
  let anuladas = 0;
  let ventasVirtuales = 0;
  let ventasPagadasPeriod = 0;
  let egresosPeriod = 0;
  let egresosEfectivoCents = 0;
  let egresosTransferenciaBucketCents = 0;
  let cantidadEgresosPeriod = 0;
  const expensesByDayCents = new Map<string, number>();
  const reportExpensesEfectivoLines: ReportExpenseDetailLine[] = [];
  const reportExpensesOtrosLines: ReportExpenseDetailLine[] = [];

  for (const o of orders) {
    const createdAt = typeof o.created_at === "string" ? o.created_at : null;
    const dk = createdAt ? reportCalendarDayKeyFromIso(createdAt) : "";
    if (!createdAt || !dayInRange(dk, rangeFrom, rangeTo)) continue;
    const total = Number(o.total_cents ?? 0);
    if (o.status === "paid") {
      ventasPagadasPeriod += 1;
      totalCobradoPedidos += total;
      const ref = String(o.wompi_reference ?? "");
      if (!ref.startsWith("POS:")) ventasVirtuales += total;
      if (ref === "POS:cash") efectivo += total;
      else if (
        ref === "POS:transfer" ||
        ref === "POS:mixed" ||
        !ref.startsWith("POS:")
      ) {
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

  const paidOrdersForChart = orders.filter(
    (o) =>
      o.status === "paid" &&
      typeof o.created_at === "string" &&
      dayInRange(reportCalendarDayKeyFromIso(o.created_at), chartFrom, chartTo),
  );

  const periodDayCount = reportRangeDayCountInclusive(rangeFrom, rangeTo);
  const needsLineDetailForPeriod = periodDayCount <= REPORT_LINE_DETAIL_MAX_DAYS;
  const revenueApproxFromOrderTotals = !needsLineDetailForPeriod;

  const paidOrderIdsForItems = [
    ...new Set(
      [
        ...(needsLineDetailForPeriod ? paidPeriodOrders : []),
        ...paidOrdersForChart,
      ]
        .map((o) => o.id)
        .filter(Boolean),
    ),
  ];

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
    }
  }

  let ingresosSinIvaPeriod: number;
  let ingresosConIvaPeriod: number;
  let gananciaBruta: number;

  if (needsLineDetailForPeriod) {
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
  } else {
    const rev = revenueNetGrossFromOrderTotals(paidPeriodOrders);
    ingresosSinIvaPeriod = rev.net;
    ingresosConIvaPeriod = rev.gross;
    gananciaBruta = 0;
  }
  const ivaRecaudadoPeriod = Math.max(
    0,
    ingresosConIvaPeriod - ingresosSinIvaPeriod,
  );

  for (const e of expenses) {
    if ((e as { is_cancelled?: boolean }).is_cancelled === true) continue;
    const raw =
      typeof e.expense_date === "string" && String(e.expense_date).length >= 10
        ? String(e.expense_date).slice(0, 10)
        : typeof e.created_at === "string" && e.created_at
          ? reportCalendarDayKeyFromIso(e.created_at)
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
    const line: ReportExpenseDetailLine = {
      id: String(e.id),
      concept: String((e as { concept?: string }).concept ?? ""),
      amount_cents: amount,
      expense_date: raw,
      payment_method: String((e as { payment_method?: string }).payment_method ?? ""),
      category:
        (e as { category?: string | null }).category != null
          ? String((e as { category?: string | null }).category)
          : null,
      created_at:
        typeof (e as { created_at?: string }).created_at === "string"
          ? (e as { created_at: string }).created_at
          : null,
    };
    if (pm === "efectivo") {
      egresosEfectivoCents += amount;
      reportExpensesEfectivoLines.push(line);
    } else {
      egresosTransferenciaBucketCents += amount;
      reportExpensesOtrosLines.push(line);
    }
  }

  const compareReportExpenseLines = (
    a: ReportExpenseDetailLine,
    b: ReportExpenseDetailLine,
  ) => {
    const byDate = b.expense_date.localeCompare(a.expense_date);
    if (byDate !== 0) return byDate;
    return (b.created_at ?? "").localeCompare(a.created_at ?? "");
  };
  reportExpensesEfectivoLines.sort(compareReportExpenseLines);
  reportExpensesOtrosLines.sort(compareReportExpenseLines);

  const gananciaNeta = gananciaBruta - egresosPeriod;
  const efectivoNetoCaja = efectivo - egresosEfectivoCents;
  const transferenciaNeta = transferencia - egresosTransferenciaBucketCents;

  const trendDayKeys = dayKeysInclusiveReport(chartFrom, chartTo);
  const trendByDay = new Map(trendDayKeys.map((key) => [key, 0]));
  const paidOrdersPerTrendDay = new Map<string, number>();

  for (const o of paidOrdersForChart) {
    const key = reportCalendarDayKeyFromIso(o.created_at);
    if (!trendByDay.has(key)) continue;
    paidOrdersPerTrendDay.set(key, (paidOrdersPerTrendDay.get(key) ?? 0) + 1);
    const { gross } = revenueNetGrossFromLines(o, orderItems, productsById);
    trendByDay.set(key, (trendByDay.get(key) ?? 0) + gross);
  }

  let peakIncomeDayKey: string | null = null;
  let peakIncomeDayCents = 0;
  const reportIncomeChartPoints: TicketTrendPoint[] = trendDayKeys.map((key) => {
    const value = trendByDay.get(key) ?? 0;
    if (value > peakIncomeDayCents) {
      peakIncomeDayCents = value;
      peakIncomeDayKey = key;
    }
    const n = paidOrdersPerTrendDay.get(key) ?? 0;
    const label = prettyReportDayShortLabel(key);
    const eg = expensesByDayCents.get(key) ?? 0;
    return {
      monthKey: key,
      labelX: label,
      dayKey: key,
      detail: `${label}: ${formatCop(value)} ingresos (IVA, ventas pagadas) · ${formatCop(eg)} egresos`,
      avgCents: value,
      orderCount: n,
      expenseCents: eg,
    };
  });

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
    ordersRangeError: ordersResult.error,
    revenueApproxFromOrderTotals,
  };
}
