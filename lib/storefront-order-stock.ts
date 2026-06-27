import type { SupabaseClient } from "@supabase/supabase-js";

type KitDeductionRow = {
  product_id?: string;
  stock_deducted_local?: number;
  stock_deducted_warehouse?: number;
};

type ProductStockRow = {
  stock_local: number | null;
  stock_warehouse: number | null;
};

type ProductDeductionPlan = {
  kind: "product";
  itemId: string;
  productId: string;
  takeL: number;
  takeW: number;
};

type KitDeductionPlan = {
  kind: "kit";
  productId: string;
  takeL: number;
  takeW: number;
};

type StockPlan = ProductDeductionPlan | KitDeductionPlan;

export type DeductOrderItemsStockResult =
  | { ok: true }
  | { ok: false; reason: "no_items" | "product_missing" | "insufficient_stock" | "db" };

async function loadProductStock(
  supabase: SupabaseClient,
  productId: string,
  cache: Map<string, ProductStockRow>,
): Promise<ProductStockRow | null> {
  if (cache.has(productId)) return cache.get(productId)!;
  const { data, error } = await supabase
    .from("products")
    .select("stock_local,stock_warehouse")
    .eq("id", productId)
    .maybeSingle();
  if (error || !data) return null;
  cache.set(productId, data);
  return data;
}

function planProductDeduction(
  itemId: string,
  productId: string,
  quantity: number,
  prod: ProductStockRow,
): ProductDeductionPlan | "insufficient_stock" {
  let w = Number(prod.stock_warehouse ?? 0);
  let l = Number(prod.stock_local ?? 0);
  let q = Math.max(0, Math.floor(quantity));
  const takeL = Math.min(l, q);
  l -= takeL;
  q -= takeL;
  const takeW = Math.min(w, q);
  w -= takeW;
  q -= takeW;
  if (q > 0) return "insufficient_stock";
  return { kind: "product", itemId, productId, takeL, takeW };
}

async function buildStockPlans(
  supabase: SupabaseClient,
  orderId: string,
): Promise<
  | { ok: true; plans: StockPlan[] }
  | { ok: false; reason: Exclude<DeductOrderItemsStockResult, { ok: true }>["reason"] }
> {
  const { data: items, error } = await supabase
    .from("order_items")
    .select("id,product_id,kit_id,quantity,kit_component_deductions")
    .eq("order_id", orderId);

  if (error) return { ok: false, reason: "db" };
  if (!items?.length) return { ok: false, reason: "no_items" };

  const stockCache = new Map<string, ProductStockRow>();
  const plans: StockPlan[] = [];

  for (const it of items) {
    const itemId = it.id as string | null;
    if (!itemId) continue;

    const kitId = it.kit_id as string | null;
    if (kitId) {
      const raw = it.kit_component_deductions;
      const deductions = Array.isArray(raw) ? raw : [];
      for (const row of deductions) {
        const d = row as KitDeductionRow;
        const pid = d.product_id != null ? String(d.product_id) : "";
        if (!pid) continue;
        const takeL = Math.max(0, Math.floor(Number(d.stock_deducted_local ?? 0)));
        const takeW = Math.max(0, Math.floor(Number(d.stock_deducted_warehouse ?? 0)));
        if (takeL === 0 && takeW === 0) continue;

        const prod = await loadProductStock(supabase, pid, stockCache);
        if (!prod) return { ok: false, reason: "product_missing" };

        const l = Number(prod.stock_local ?? 0);
        const w = Number(prod.stock_warehouse ?? 0);
        if (takeL > l || takeW > w) {
          return { ok: false, reason: "insufficient_stock" };
        }

        prod.stock_local = l - takeL;
        prod.stock_warehouse = w - takeW;
        plans.push({ kind: "kit", productId: pid, takeL, takeW });
      }
      continue;
    }

    const pid = it.product_id as string | null;
    if (!pid) continue;

    const prod = await loadProductStock(supabase, pid, stockCache);
    if (!prod) return { ok: false, reason: "product_missing" };

    const planned = planProductDeduction(
      itemId,
      pid,
      Number(it.quantity) || 0,
      prod,
    );
    if (planned === "insufficient_stock") {
      return { ok: false, reason: "insufficient_stock" };
    }

    prod.stock_local = Number(prod.stock_local ?? 0) - planned.takeL;
    prod.stock_warehouse = Number(prod.stock_warehouse ?? 0) - planned.takeW;
    plans.push(planned);
  }

  return { ok: true, plans };
}

async function applyStockPlans(
  supabase: SupabaseClient,
  plans: StockPlan[],
): Promise<DeductOrderItemsStockResult> {
  for (const plan of plans) {
    const { data: prod, error: pErr } = await supabase
      .from("products")
      .select("stock_warehouse,stock_local")
      .eq("id", plan.productId)
      .maybeSingle();
    if (pErr) return { ok: false, reason: "db" };
    if (!prod) return { ok: false, reason: "product_missing" };

    const { error: uErr } = await supabase
      .from("products")
      .update({
        stock_local: Math.max(0, Number(prod.stock_local ?? 0) - plan.takeL),
        stock_warehouse: Math.max(0, Number(prod.stock_warehouse ?? 0) - plan.takeW),
      })
      .eq("id", plan.productId);
    if (uErr) return { ok: false, reason: "db" };

    if (plan.kind === "product") {
      const { error: iErr } = await supabase
        .from("order_items")
        .update({
          stock_deducted_local: plan.takeL,
          stock_deducted_warehouse: plan.takeW,
        })
        .eq("id", plan.itemId);
      if (iErr) return { ok: false, reason: "db" };
    }
  }

  return { ok: true };
}

async function reverseStockPlans(
  supabase: SupabaseClient,
  plans: StockPlan[],
) {
  for (const plan of [...plans].reverse()) {
    const { data: prod } = await supabase
      .from("products")
      .select("stock_local,stock_warehouse")
      .eq("id", plan.productId)
      .maybeSingle();
    if (!prod) continue;

    await supabase
      .from("products")
      .update({
        stock_local: Math.max(0, Number(prod.stock_local ?? 0) + plan.takeL),
        stock_warehouse: Math.max(0, Number(prod.stock_warehouse ?? 0) + plan.takeW),
      })
      .eq("id", plan.productId);
  }
}

/**
 * Descuenta inventario de las líneas de un pedido y registra `stock_deducted_*`
 * en productos sueltos (kits usan `kit_component_deductions` ya guardado).
 */
export async function deductOrderItemsStock(
  supabase: SupabaseClient,
  orderId: string,
): Promise<DeductOrderItemsStockResult> {
  const built = await buildStockPlans(supabase, orderId);
  if (!built.ok) return { ok: false, reason: built.reason };

  const applied: StockPlan[] = [];
  for (const plan of built.plans) {
    const { data: prod, error: pErr } = await supabase
      .from("products")
      .select("stock_warehouse,stock_local")
      .eq("id", plan.productId)
      .maybeSingle();
    if (pErr || !prod) {
      await reverseStockPlans(supabase, applied);
      return { ok: false, reason: pErr ? "db" : "product_missing" };
    }

    const { error: uErr } = await supabase
      .from("products")
      .update({
        stock_local: Math.max(0, Number(prod.stock_local ?? 0) - plan.takeL),
        stock_warehouse: Math.max(0, Number(prod.stock_warehouse ?? 0) - plan.takeW),
      })
      .eq("id", plan.productId);
    if (uErr) {
      await reverseStockPlans(supabase, applied);
      return { ok: false, reason: "db" };
    }

    if (plan.kind === "product") {
      const { error: iErr } = await supabase
        .from("order_items")
        .update({
          stock_deducted_local: plan.takeL,
          stock_deducted_warehouse: plan.takeW,
        })
        .eq("id", plan.itemId);
      if (iErr) {
        await reverseStockPlans(supabase, applied);
        return { ok: false, reason: "db" };
      }
    }

    applied.push(plan);
  }

  return { ok: true };
}

async function rollbackTransferOrder(
  supabase: SupabaseClient,
  orderId: string,
) {
  await supabase.from("order_items").delete().eq("order_id", orderId);
  await supabase.from("orders").delete().eq("id", orderId);
}

/** Descuenta stock al crear pedido web por transferencia; revierte pedido si falla. */
export async function deductTransferWebOrderStock(
  supabase: SupabaseClient,
  orderId: string,
): Promise<DeductOrderItemsStockResult> {
  const result = await deductOrderItemsStock(supabase, orderId);
  if (!result.ok) {
    await rollbackTransferOrder(supabase, orderId);
  }
  return result;
}
