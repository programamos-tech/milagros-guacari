"use server";

import { logAdminActivity } from "@/lib/admin-activity-log";
import { ORDER_CANCELLATION_REASON_MIN_LENGTH } from "@/lib/orders-constants";
import { loadAdminPermissions } from "@/lib/load-admin-permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const ALLOWED = new Set(["pending", "paid", "failed", "cancelled"]);

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

  let payload: { status: string; cancellation_reason: string | null };
  if (next === "cancelled") {
    const reason = String(cancellationReason ?? "").trim();
    if (reason.length < ORDER_CANCELLATION_REASON_MIN_LENGTH) {
      return { ok: false as const, error: "reason_required" as const };
    }
    payload = { status: next, cancellation_reason: reason };
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
  return { ok: true as const };
}
