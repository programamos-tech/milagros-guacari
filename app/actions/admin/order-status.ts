"use server";

import {
  activityStockTraceToMetadata,
  buildOrderCancelStockTrace,
} from "@/lib/activity-log-stock";
import { logAdminActivity } from "@/lib/admin-activity-log";
import { ORDER_CANCELLATION_REASON_MIN_LENGTH } from "@/lib/orders-constants";
import { loadAdminPermissions } from "@/lib/load-admin-permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isVentaFisica } from "@/lib/ventas-sales";
import { revalidatePath } from "next/cache";

const ALLOWED = new Set(["pending", "paid", "failed", "cancelled"]);

function isRestoreRpcMissingError(err: {
  message?: string;
  code?: string;
  details?: string;
}): boolean {
  const m = `${err.message ?? ""} ${err.details ?? ""}`.toLowerCase();
  return (
    err.code === "42883" ||
    err.code === "PGRST202" ||
    m.includes("restore_order_items_stock") ||
    m.includes("could not find the function") ||
    m.includes("schema cache")
  );
}

async function orderStockWasRestored(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  orderId: string,
): Promise<boolean> {
  const { data: order } = await supabase
    .from("orders")
    .select("stock_restored_at")
    .eq("id", orderId)
    .maybeSingle();
  return order?.stock_restored_at != null;
}

/** Devuelve stock al anular; usa RPC si existe, si no actualización por línea (compatibilidad). */
async function restoreOrderStockOnCancel(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  orderId: string,
): Promise<boolean> {
  const { error: rpcErr } = await supabase.rpc("restore_order_items_stock", {
    p_order_id: orderId,
  });
  if (!rpcErr) {
    if (await orderStockWasRestored(supabase, orderId)) return true;
  } else if (!isRestoreRpcMissingError(rpcErr)) {
    return false;
  }

  const { data: order } = await supabase
    .from("orders")
    .select("status,wompi_reference,stock_restored_at")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.stock_restored_at != null) {
    return true;
  }

  const { data: items } = await supabase
    .from("order_items")
    .select(
      "product_id,quantity,stock_deducted_local,stock_deducted_warehouse,kit_id,kit_component_deductions",
    )
    .eq("order_id", orderId);

  const pos = isVentaFisica(
    order.wompi_reference != null ? String(order.wompi_reference) : null,
  );

  for (const it of items ?? []) {
    const kitId = it.kit_id != null ? String(it.kit_id) : "";
    const rawDeductions = it.kit_component_deductions;
    if (kitId && Array.isArray(rawDeductions)) {
      for (const row of rawDeductions) {
        const d = row as {
          product_id?: string;
          stock_deducted_local?: number;
          stock_deducted_warehouse?: number;
        };
        const pid = d.product_id != null ? String(d.product_id) : "";
        if (!pid) continue;
        const loc = Math.max(0, Math.floor(Number(d.stock_deducted_local ?? 0)));
        const wh = Math.max(0, Math.floor(Number(d.stock_deducted_warehouse ?? 0)));
        if (loc === 0 && wh === 0) continue;
        if (!(await addProductStock(supabase, pid, loc, wh))) return false;
      }
      continue;
    }

    const pid = it.product_id != null ? String(it.product_id) : "";
    if (!pid) continue;
    let loc = Math.max(0, Math.floor(Number(it.stock_deducted_local ?? 0)));
    let wh = Math.max(0, Math.floor(Number(it.stock_deducted_warehouse ?? 0)));
    if (loc === 0 && wh === 0) {
      if (!pos) continue;
      loc = Math.max(0, Math.floor(Number(it.quantity ?? 0)));
    }
    if (loc === 0 && wh === 0) continue;
    if (!(await addProductStock(supabase, pid, loc, wh))) return false;
  }

  const { error: markErr } = await supabase
    .from("orders")
    .update({ stock_restored_at: new Date().toISOString() })
    .eq("id", orderId)
    .is("stock_restored_at", null);
  return !markErr;
}

async function addProductStock(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  productId: string,
  localDelta: number,
  warehouseDelta: number,
): Promise<boolean> {
  const { data: prod } = await supabase
    .from("products")
    .select("stock_local,stock_warehouse")
    .eq("id", productId)
    .maybeSingle();
  if (!prod) return false;

  const { error: uErr } = await supabase
    .from("products")
    .update({
      stock_local: Math.max(0, Number(prod.stock_local ?? 0)) + localDelta,
      stock_warehouse: Math.max(0, Number(prod.stock_warehouse ?? 0)) + warehouseDelta,
    })
    .eq("id", productId);
  return !uErr;
}

export async function updateAdminOrderStatus(
  orderId: string,
  status: string,
  cancellationReason?: string | null,
) {
  const id = String(orderId ?? "").trim();
  const next = String(status ?? "").trim();
  if (!id || !ALLOWED.has(next)) {
    return { ok: false as const, error: "invalid" as const };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "auth" as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return { ok: false as const, error: "auth" as const };

  const perm = await loadAdminPermissions();
  if (!perm?.permissions.ventas_crear) {
    return { ok: false as const, error: "forbidden" as const };
  }

  const { data: orderBefore } = await supabase
    .from("orders")
    .select("status, stock_restored_at")
    .eq("id", id)
    .maybeSingle();

  if (!orderBefore) return { ok: false as const, error: "db" as const };

  let payload: { status: string; cancellation_reason: string | null };
  let stockWasRestored = orderBefore.stock_restored_at != null;

  if (next === "cancelled") {
    const reason = String(cancellationReason ?? "").trim();
    if (reason.length < ORDER_CANCELLATION_REASON_MIN_LENGTH) {
      return { ok: false as const, error: "reason_required" as const };
    }
    payload = { status: next, cancellation_reason: reason };

    const stockTrace = await buildOrderCancelStockTrace(supabase, id, {
      inventoryIsPreRestore: !stockWasRestored,
    });

    if (orderBefore.stock_restored_at == null) {
      const restored = await restoreOrderStockOnCancel(supabase, id);
      if (!restored) {
        return { ok: false as const, error: "stock_restore" as const };
      }
      stockWasRestored = await orderStockWasRestored(supabase, id);
    }

    const { error } = await supabase.from("orders").update(payload).eq("id", id);
    if (error) return { ok: false as const, error: "db" as const };

    const finalStockTrace = {
      ...stockTrace,
      stock_restored:
        stockWasRestored && stockTrace.stock_movements.length > 0,
      stock_already_restored: orderBefore.stock_restored_at != null,
    };

    await logAdminActivity(supabase, {
      actorId: user.id,
      actionType: "sale_cancelled",
      entityType: "order",
      entityId: id,
      summary: "Factura anulada",
      metadata: {
        cancellation_reason: reason,
        ...activityStockTraceToMetadata(finalStockTrace),
      },
    });
    revalidatePath("/admin/actividades");
    revalidatePath(`/admin/orders/${id}`);
    revalidatePath("/admin/orders");
    revalidatePath("/admin/ventas");
    if (stockWasRestored) {
      revalidatePath("/admin/products");
    }
    return { ok: true as const };
  }

  payload = { status: next, cancellation_reason: null };

  const { error } = await supabase.from("orders").update(payload).eq("id", id);
  if (error) return { ok: false as const, error: "db" as const };

  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/ventas");
  return { ok: true as const };
}
