"use server";

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

/** Devuelve stock al anular; usa RPC si existe, si no actualización por línea (compatibilidad). */
async function restoreOrderStockOnCancel(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  orderId: string,
): Promise<boolean> {
  const { error: rpcErr } = await supabase.rpc("restore_order_items_stock", {
    p_order_id: orderId,
  });
  if (!rpcErr) return true;
  if (!isRestoreRpcMissingError(rpcErr)) return false;

  const { data: order } = await supabase
    .from("orders")
    .select("status,wompi_reference,stock_restored_at")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.status !== "paid" || order.stock_restored_at != null) {
    return true;
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("product_id,quantity,stock_deducted_local,stock_deducted_warehouse")
    .eq("order_id", orderId);

  const pos = isVentaFisica(
    order.wompi_reference != null ? String(order.wompi_reference) : null,
  );

  for (const it of items ?? []) {
    const pid = it.product_id != null ? String(it.product_id) : "";
    if (!pid) continue;
    let loc = Math.max(0, Math.floor(Number(it.stock_deducted_local ?? 0)));
    let wh = Math.max(0, Math.floor(Number(it.stock_deducted_warehouse ?? 0)));
    if (loc === 0 && wh === 0) {
      if (!pos) continue;
      loc = Math.max(0, Math.floor(Number(it.quantity ?? 0)));
    }
    if (loc === 0 && wh === 0) continue;

    const { data: prod } = await supabase
      .from("products")
      .select("stock_local,stock_warehouse")
      .eq("id", pid)
      .maybeSingle();
    if (!prod) return false;

    const { error: uErr } = await supabase
      .from("products")
      .update({
        stock_local: Math.max(0, Number(prod.stock_local ?? 0)) + loc,
        stock_warehouse: Math.max(0, Number(prod.stock_warehouse ?? 0)) + wh,
      })
      .eq("id", pid);
    if (uErr) return false;
  }

  const { error: markErr } = await supabase
    .from("orders")
    .update({ stock_restored_at: new Date().toISOString() })
    .eq("id", orderId);
  return !markErr;
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
  if (next === "cancelled") {
    const reason = String(cancellationReason ?? "").trim();
    if (reason.length < ORDER_CANCELLATION_REASON_MIN_LENGTH) {
      return { ok: false as const, error: "reason_required" as const };
    }
    payload = { status: next, cancellation_reason: reason };

    if (orderBefore.status === "paid" && orderBefore.stock_restored_at == null) {
      const restored = await restoreOrderStockOnCancel(supabase, id);
      if (!restored) {
        return { ok: false as const, error: "stock_restore" as const };
      }
    }
  } else {
    payload = { status: next, cancellation_reason: null };
  }

  const { error } = await supabase.from("orders").update(payload).eq("id", id);
  if (error) return { ok: false as const, error: "db" as const };

  if (next === "cancelled") {
    await logAdminActivity(supabase, {
      actorId: user.id,
      actionType: "sale_cancelled",
      entityType: "order",
      entityId: id,
      summary: "Factura anulada",
      metadata: {
        cancellation_reason: String(cancellationReason ?? "").trim(),
      },
    });
    revalidatePath("/admin/actividades");
  }

  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/ventas");
  if (next === "cancelled" && orderBefore.status === "paid") {
    revalidatePath("/admin/products");
  }
  return { ok: true as const };
}
