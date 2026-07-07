"use server";

import {
  ADMIN_FULFILLMENT_OPTIONS,
  isOrderFulfillmentStatus,
  type OrderFulfillmentStatus,
} from "@/lib/order-fulfillment";
import { loadAdminPermissions } from "@/lib/load-admin-permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const ALLOWED = new Set(ADMIN_FULFILLMENT_OPTIONS.map((o) => o.value));

export async function updateAdminOrderFulfillment(
  orderId: string,
  fulfillmentStatus: string,
) {
  const id = String(orderId ?? "").trim();
  const next = String(fulfillmentStatus ?? "").trim() as OrderFulfillmentStatus;
  if (!id || !isOrderFulfillmentStatus(next) || !ALLOWED.has(next)) {
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

  const { data: order } = await supabase
    .from("orders")
    .select("checkout_payment_method, status")
    .eq("id", id)
    .maybeSingle();
  if (!order) return { ok: false as const, error: "db" as const };
  if (String(order.checkout_payment_method) !== "transfer") {
    return { ok: false as const, error: "not_transfer" as const };
  }
  if (String(order.status) === "cancelled") {
    return { ok: false as const, error: "cancelled" as const };
  }

  const paymentStatus = next === "completed" ? "paid" : String(order.status);

  const { error } = await supabase
    .from("orders")
    .update({
      fulfillment_status: next,
      status: paymentStatus,
    })
    .eq("id", id);

  if (error) return { ok: false as const, error: "db" as const };

  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/ventas");
  revalidatePath("/pedido");
  revalidatePath("/cuenta/pedidos");
  revalidatePath(`/cuenta/pedidos/${id}`);

  return { ok: true as const };
}
