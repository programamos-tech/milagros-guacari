import type { SupabaseClient } from "@supabase/supabase-js";
import type { KitComponentDeduction } from "@/lib/product-kits";
import { isVentaFisica } from "@/lib/ventas-sales";

export type ActivityStockMovement = {
  product_id: string;
  product_name: string;
  local_delta: number;
  warehouse_delta: number;
  local_before: number | null;
  local_after: number | null;
  warehouse_before: number | null;
  warehouse_after: number | null;
  /** Ej. línea directa o componente de kit. */
  context: string | null;
};

export type ActivityStockTrace = {
  stock_direction: "deduct" | "restore" | "none";
  stock_restored: boolean;
  stock_already_restored: boolean;
  stock_movements: ActivityStockMovement[];
};

type ProductStockRow = {
  id: string;
  name: string;
  stock_local: number | null;
  stock_warehouse: number | null;
};

function floorQty(v: unknown): number {
  return Math.max(0, Math.floor(Number(v ?? 0)));
}

function movementKey(productId: string, context: string | null): string {
  return `${productId}\0${context ?? ""}`;
}

function appendMovementDelta(
  map: Map<string, ActivityStockMovement>,
  row: {
    product_id: string;
    product_name: string;
    local_delta: number;
    warehouse_delta: number;
    context: string | null;
  },
): void {
  const key = movementKey(row.product_id, row.context);
  const existing = map.get(key);
  map.set(key, {
    product_id: row.product_id,
    product_name: row.product_name,
    local_delta: row.local_delta + (existing?.local_delta ?? 0),
    warehouse_delta: row.warehouse_delta + (existing?.warehouse_delta ?? 0),
    local_before: null,
    local_after: null,
    warehouse_before: null,
    warehouse_after: null,
    context: row.context,
  });
}

function applyStockSnapshots(
  map: Map<string, ActivityStockMovement>,
  stockByProductId: Map<string, ProductStockRow>,
  direction: "deduct" | "restore",
  inventoryIsPreChange: boolean,
): void {
  for (const m of map.values()) {
    const stock = stockByProductId.get(m.product_id);
    if (!stock) continue;
    const curLocal = floorQty(stock.stock_local);
    const curWh = floorQty(stock.stock_warehouse);
    const absLocal = Math.abs(m.local_delta);
    const absWh = Math.abs(m.warehouse_delta);

    if (direction === "deduct") {
      m.local_before = curLocal;
      m.local_after = Math.max(0, curLocal + m.local_delta);
      m.warehouse_before = curWh;
      m.warehouse_after = Math.max(0, curWh + m.warehouse_delta);
      continue;
    }

    if (inventoryIsPreChange) {
      m.local_before = curLocal;
      m.local_after = Math.max(0, curLocal + absLocal);
      m.warehouse_before = curWh;
      m.warehouse_after = Math.max(0, curWh + absWh);
    } else {
      m.local_after = curLocal;
      m.local_before = Math.max(0, curLocal - absLocal);
      m.warehouse_after = curWh;
      m.warehouse_before = Math.max(0, curWh - absWh);
    }
  }
}

function finalizeTrace(
  map: Map<string, ActivityStockMovement>,
  direction: "deduct" | "restore" | "none",
  stockRestored: boolean,
  alreadyRestored: boolean,
): ActivityStockTrace {
  const movements = [...map.values()].filter(
    (m) => m.local_delta !== 0 || m.warehouse_delta !== 0,
  );
  return {
    stock_direction: direction,
    stock_restored: stockRestored,
    stock_already_restored: alreadyRestored,
    stock_movements: movements,
  };
}

export function buildPosSaleStockTrace(params: {
  productLines: {
    productId: string;
    name: string;
    quantity: number;
  }[];
  kitLines: {
    kitName: string;
    deductions: KitComponentDeduction[];
    productNames: Map<string, string>;
  }[];
  stockByProductId: Map<string, ProductStockRow>;
}): ActivityStockTrace {
  const map = new Map<string, ActivityStockMovement>();

  for (const line of params.productLines) {
    const qty = floorQty(line.quantity);
    if (qty < 1) continue;
    appendMovementDelta(map, {
      product_id: line.productId,
      product_name: line.name,
      local_delta: -qty,
      warehouse_delta: 0,
      context: null,
    });
  }

  for (const kit of params.kitLines) {
    for (const d of kit.deductions) {
      const pid = String(d.product_id ?? "");
      if (!pid) continue;
      const loc = floorQty(d.stock_deducted_local);
      const wh = floorQty(d.stock_deducted_warehouse);
      if (loc === 0 && wh === 0) continue;
      appendMovementDelta(map, {
        product_id: pid,
        product_name: kit.productNames.get(pid) ?? "Producto",
        local_delta: -loc,
        warehouse_delta: -wh,
        context: `Kit: ${kit.kitName}`,
      });
    }
  }

  applyStockSnapshots(map, params.stockByProductId, "deduct", true);

  return finalizeTrace(map, "deduct", false, false);
}

export async function buildOrderCancelStockTrace(
  supabase: SupabaseClient,
  orderId: string,
  opts: { inventoryIsPreRestore: boolean },
): Promise<ActivityStockTrace> {
  const [{ data: order }, { data: items }] = await Promise.all([
    supabase.from("orders").select("wompi_reference").eq("id", orderId).maybeSingle(),
    supabase
      .from("order_items")
      .select(
        "product_id,quantity,product_name_snapshot,kit_id,stock_deducted_local,stock_deducted_warehouse,kit_component_deductions",
      )
      .eq("order_id", orderId),
  ]);

  const pos = isVentaFisica(
    order?.wompi_reference != null ? String(order.wompi_reference) : null,
  );

  const productIds = new Set<string>();
  for (const it of items ?? []) {
    const kitDeductions = it.kit_component_deductions;
    if (it.kit_id && Array.isArray(kitDeductions)) {
      for (const row of kitDeductions) {
        const d = row as { product_id?: string };
        if (d.product_id) productIds.add(String(d.product_id));
      }
    } else if (it.product_id) {
      productIds.add(String(it.product_id));
    }
  }

  const stockById = new Map<string, ProductStockRow>();
  if (productIds.size > 0) {
    const { data: products } = await supabase
      .from("products")
      .select("id,name,stock_local,stock_warehouse")
      .in("id", [...productIds]);
    for (const p of products ?? []) {
      stockById.set(String(p.id), {
        id: String(p.id),
        name: String(p.name ?? "Producto"),
        stock_local: p.stock_local,
        stock_warehouse: p.stock_warehouse,
      });
    }
  }

  const map = new Map<string, ActivityStockMovement>();

  for (const it of items ?? []) {
    const kitId = it.kit_id != null ? String(it.kit_id) : "";
    const kitLabel = kitId
      ? String(it.product_name_snapshot ?? "Kit").replace(/^Kit:\s*/i, "")
      : null;
    const rawDeductions = it.kit_component_deductions;

    if (kitId && Array.isArray(rawDeductions)) {
      for (const row of rawDeductions) {
        const d = row as KitComponentDeduction;
        const pid = String(d.product_id ?? "");
        if (!pid) continue;
        const loc = floorQty(d.stock_deducted_local);
        const wh = floorQty(d.stock_deducted_warehouse);
        if (loc === 0 && wh === 0) continue;
        const stock = stockById.get(pid);
        appendMovementDelta(map, {
          product_id: pid,
          product_name: stock?.name ?? "Producto",
          local_delta: loc,
          warehouse_delta: wh,
          context: kitLabel ? `Kit: ${kitLabel}` : "Kit",
        });
      }
      continue;
    }

    const pid = it.product_id != null ? String(it.product_id) : "";
    if (!pid) continue;
    let loc = floorQty(it.stock_deducted_local);
    let wh = floorQty(it.stock_deducted_warehouse);
    if (loc === 0 && wh === 0) {
      if (!pos) continue;
      loc = floorQty(it.quantity);
    }
    if (loc === 0 && wh === 0) continue;

    const stock = stockById.get(pid);
    appendMovementDelta(map, {
      product_id: pid,
      product_name: String(it.product_name_snapshot ?? stock?.name ?? "Producto"),
      local_delta: loc,
      warehouse_delta: wh,
      context: null,
    });
  }

  applyStockSnapshots(map, stockById, "restore", opts.inventoryIsPreRestore);

  const hasMovements = map.size > 0;
  return finalizeTrace(map, hasMovements ? "restore" : "none", false, false);
}

export function activityStockTraceToMetadata(
  trace: ActivityStockTrace,
): Record<string, unknown> {
  return {
    stock_direction: trace.stock_direction,
    stock_restored: trace.stock_restored,
    stock_already_restored: trace.stock_already_restored,
    stock_movements: trace.stock_movements,
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

export function parseActivityStockTrace(
  metadata: Record<string, unknown> | null | undefined,
): ActivityStockTrace | null {
  if (!metadata) return null;
  const raw = metadata.stock_movements;
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const movements: ActivityStockMovement[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const productId = String(item.product_id ?? "").trim();
    if (!productId) continue;
    movements.push({
      product_id: productId,
      product_name: String(item.product_name ?? "Producto"),
      local_delta: Number(item.local_delta ?? 0),
      warehouse_delta: Number(item.warehouse_delta ?? 0),
      local_before:
        item.local_before != null ? floorQty(item.local_before) : null,
      local_after: item.local_after != null ? floorQty(item.local_after) : null,
      warehouse_before:
        item.warehouse_before != null ? floorQty(item.warehouse_before) : null,
      warehouse_after:
        item.warehouse_after != null ? floorQty(item.warehouse_after) : null,
      context: item.context != null ? String(item.context) : null,
    });
  }

  if (movements.length === 0) return null;

  return {
    stock_direction:
      metadata.stock_direction === "deduct" || metadata.stock_direction === "restore"
        ? metadata.stock_direction
        : "none",
    stock_restored: Boolean(metadata.stock_restored),
    stock_already_restored: Boolean(metadata.stock_already_restored),
    stock_movements: movements,
  };
}

export function formatStockLocationDelta(local: number, warehouse: number): string {
  const parts: string[] = [];
  if (local !== 0) {
    parts.push(`tienda ${local > 0 ? "+" : ""}${local}`);
  }
  if (warehouse !== 0) {
    parts.push(`depósito ${warehouse > 0 ? "+" : ""}${warehouse}`);
  }
  return parts.length > 0 ? parts.join(" · ") : "sin movimiento";
}

export function formatStockBeforeAfter(
  before: number | null,
  after: number | null,
): string | null {
  if (before == null || after == null) return null;
  return `${before} → ${after}`;
}

export function stockTraceSummaryLabel(trace: ActivityStockTrace): string {
  const n = trace.stock_movements.length;
  if (trace.stock_direction === "deduct") {
    return `Stock descontado en ${n} ${n === 1 ? "producto" : "productos"}`;
  }
  if (trace.stock_direction === "restore") {
    if (!trace.stock_restored) {
      return "Sin devolución de stock registrada";
    }
    if (trace.stock_already_restored) {
      return `Stock ya devuelto (${n} ${n === 1 ? "producto" : "productos"})`;
    }
    return `Stock devuelto en ${n} ${n === 1 ? "producto" : "productos"}`;
  }
  return "Sin movimiento de stock";
}
