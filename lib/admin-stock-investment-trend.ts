import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createdAtBoundsForReportYmdRange,
  reportSalesTrendWeekRanges,
  todayYmdInReportStore,
} from "@/lib/admin-report-range";
import { parseActivityStockTrace } from "@/lib/activity-log-stock";

export type StockInvestmentTrend = {
  currentFrom: string;
  currentTo: string;
  /** Inversión estimada al inicio de la ventana (hace 7 días). */
  priorNetCents: number;
  priorGrossCents: number;
  netDelta7d: number;
  grossDelta7d: number;
  changeNetPercent: number | null;
  changeGrossPercent: number | null;
  movementCount: number;
};

type ProductCostRow = {
  id: string;
  cost_cents: number;
  cost_gross_cents: number;
};

function floorQty(v: unknown): number {
  return Math.max(0, Math.floor(Number(v ?? 0)));
}

function pctChange(current: number, prior: number): number | null {
  if (prior <= 0) return null;
  return Math.round(((current - prior) / prior) * 1000) / 10;
}

function applyQtyDelta(
  productId: string,
  deltaQty: number,
  costs: Map<string, ProductCostRow>,
  acc: { net: number; gross: number },
): void {
  if (!deltaQty) return;
  const cost = costs.get(productId);
  const netUnit = Math.max(0, Math.round(Number(cost?.cost_cents ?? 0)));
  const grossUnit = Math.max(
    0,
    Math.round(Number(cost?.cost_gross_cents ?? cost?.cost_cents ?? 0)),
  );
  acc.net += deltaQty * netUnit;
  acc.gross += deltaQty * grossUnit;
}

function deltaFromStockTrace(
  metadata: Record<string, unknown> | null,
  costs: Map<string, ProductCostRow>,
): { net: number; gross: number } {
  const acc = { net: 0, gross: 0 };
  const trace = parseActivityStockTrace(metadata ?? undefined);
  if (!trace) return acc;
  for (const m of trace.stock_movements) {
    const deltaQty = m.local_delta + m.warehouse_delta;
    applyQtyDelta(m.product_id, deltaQty, costs, acc);
  }
  return acc;
}

function processActivityRow(
  row: {
    action_type: string;
    entity_id: string | null;
    metadata: Record<string, unknown> | null;
  },
  costs: Map<string, ProductCostRow>,
): { net: number; gross: number } {
  const acc = { net: 0, gross: 0 };
  const m = row.metadata ?? {};
  const action = row.action_type;

  if (action === "stock_adjusted") {
    const prev =
      floorQty(m.previous_local) + floorQty(m.previous_warehouse);
    const next = floorQty(m.next_local) + floorQty(m.next_warehouse);
    const productId = row.entity_id ?? "";
    if (productId) applyQtyDelta(productId, next - prev, costs, acc);
    return acc;
  }

  if (action === "sale_created" || action === "sale_cancelled") {
    return deltaFromStockTrace(m, costs);
  }

  if (action === "product_created" && row.entity_id) {
    const qty = floorQty(m.stock_local) + floorQty(m.stock_warehouse);
    applyQtyDelta(row.entity_id, qty, costs, acc);
  }

  return acc;
}

async function fetchProductCosts(
  supabase: SupabaseClient,
): Promise<Map<string, ProductCostRow>> {
  const map = new Map<string, ProductCostRow>();
  const pageSize = 500;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("id, cost_cents, cost_gross_cents")
      .range(from, from + pageSize - 1);
    if (error) {
      console.error("[admin reportes] stock trend costs:", error.message);
      break;
    }
    const rows = data ?? [];
    for (const p of rows) {
      map.set(String(p.id), {
        id: String(p.id),
        cost_cents: Number(p.cost_cents ?? 0),
        cost_gross_cents: Number(p.cost_gross_cents ?? p.cost_cents ?? 0),
      });
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return map;
}

async function sumInvestmentDeltaInRange(
  supabase: SupabaseClient,
  fromYmd: string,
  toYmd: string,
  costs: Map<string, ProductCostRow>,
): Promise<{ net: number; gross: number; movementCount: number }> {
  const bounds = createdAtBoundsForReportYmdRange(fromYmd, toYmd);
  if (!bounds) return { net: 0, gross: 0, movementCount: 0 };

  const acc = { net: 0, gross: 0, movementCount: 0 };
  const pageSize = 400;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("admin_activity_log")
      .select("action_type, entity_id, metadata")
      .gte("created_at", bounds.gte)
      .lt("created_at", bounds.lt)
      .in("action_type", [
        "stock_adjusted",
        "sale_created",
        "sale_cancelled",
        "product_created",
      ])
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("[admin reportes] stock trend activity:", error.message);
      break;
    }

    const rows = data ?? [];
    for (const row of rows) {
      const delta = processActivityRow(
        row as {
          action_type: string;
          entity_id: string | null;
          metadata: Record<string, unknown> | null;
        },
        costs,
      );
      acc.net += delta.net;
      acc.gross += delta.gross;
      if (delta.net !== 0 || delta.gross !== 0) acc.movementCount += 1;
    }

    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  return acc;
}

export async function fetchStockInvestmentTrend(
  supabase: SupabaseClient,
  currentNetCents: number,
  currentGrossCents: number,
  todayYmd: string = todayYmdInReportStore(),
): Promise<StockInvestmentTrend> {
  const { currentFrom, currentTo } = reportSalesTrendWeekRanges(todayYmd);
  const costs = await fetchProductCosts(supabase);
  const { net, gross, movementCount } = await sumInvestmentDeltaInRange(
    supabase,
    currentFrom,
    currentTo,
    costs,
  );

  const priorNetCents = currentNetCents - net;
  const priorGrossCents = currentGrossCents - gross;

  return {
    currentFrom,
    currentTo,
    priorNetCents,
    priorGrossCents,
    netDelta7d: net,
    grossDelta7d: gross,
    changeNetPercent: pctChange(currentNetCents, priorNetCents),
    changeGrossPercent: pctChange(currentGrossCents, priorGrossCents),
    movementCount: movementCount,
  };
}
