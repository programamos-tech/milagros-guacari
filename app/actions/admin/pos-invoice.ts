"use server";

import { logAdminActivity } from "@/lib/admin-activity-log";
import { assertActionPermission } from "@/lib/require-admin-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type PosInvoicePayload = {
  customerId: string;
  lines: { productId: string; quantity: number }[];
  paymentMethod: "cash" | "transfer" | "mixed";
  shippingAddress: string | null;
  shippingPhone: string | null;
};

function redirectError(code: string): never {
  redirect(`/admin/ventas/nueva?error=${encodeURIComponent(code)}`);
}

function unitFinalCents(priceCents: number, hasVat: boolean, vatPercent: number): number {
  const base = Math.max(0, Math.floor(priceCents));
  if (!hasVat) return base;
  const pct = Math.max(0, vatPercent);
  return Math.round(base * (1 + pct / 100));
}

export async function createPosInvoiceAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/admin/login?error=no_profile");
  await assertActionPermission("ventas_crear");

  let payload: PosInvoicePayload;
  try {
    const raw = String(formData.get("payload") ?? "").trim();
    if (!raw) redirectError("validation");
    payload = JSON.parse(raw) as PosInvoicePayload;
  } catch {
    redirectError("validation");
  }

  const customerId = String(payload.customerId ?? "").trim();
  if (!customerId) redirectError("validation");

  const linesRaw = Array.isArray(payload.lines) ? payload.lines : [];
  const lines = linesRaw
    .map((row) => ({
      productId: String((row as { productId?: string }).productId ?? "").trim(),
      quantity: Math.floor(Number((row as { quantity?: number }).quantity)),
    }))
    .filter((r) => r.productId && r.quantity > 0);

  if (lines.length === 0) redirectError("validation");

  const paymentMethod = payload.paymentMethod;
  if (paymentMethod !== "cash" && paymentMethod !== "transfer" && paymentMethod !== "mixed") {
    redirectError("validation");
  }

  const { data: customer, error: cErr } = await supabase
    .from("customers")
    .select("id,name,email,phone")
    .eq("id", customerId)
    .maybeSingle();

  if (cErr || !customer) redirectError("customer");
  const customerRow = customer;

  const productIds = [...new Set(lines.map((l) => l.productId))];
  const { data: products, error: pErr } = await supabase
    .from("products")
    .select("id,name,price_cents,stock_local,has_vat,vat_percent")
    .in("id", productIds);

  if (pErr || !products || products.length !== productIds.length) {
    redirectError("products");
  }

  const productRows = products;
  const productById = new Map(productRows.map((p) => [p.id as string, p]));

  const qtyByProduct = new Map<string, number>();
  for (const l of lines) {
    qtyByProduct.set(l.productId, (qtyByProduct.get(l.productId) ?? 0) + l.quantity);
  }

  let subtotalCents = 0;
  let vatCents = 0;
  let totalCents = 0;
  for (const [pid, qty] of qtyByProduct) {
    const p = productById.get(pid);
    if (!p) redirectError("products");
    const price = Math.max(0, Math.floor(Number(p.price_cents ?? 0)));
    const hasVat = Boolean(p.has_vat);
    const vatPercent = Math.max(0, Number(p.vat_percent ?? 0));
    const unitFinal = unitFinalCents(price, hasVat, vatPercent);
    const stock = Number(p.stock_local ?? 0);
    if (stock < qty) redirectError("stock");
    subtotalCents += price * qty;
    totalCents += unitFinal * qty;
  }
  vatCents = Math.max(0, totalCents - subtotalCents);

  if (!Number.isFinite(totalCents) || totalCents < 0) redirectError("validation");

  const emailRaw =
    customerRow.email != null ? String(customerRow.email).trim() : "";
  const customerEmail =
    emailRaw.length > 0 ? emailRaw.toLowerCase() : `pos-${customerId.slice(0, 8)}@local.invalid`;

  const shippingAddress =
    payload.shippingAddress != null && String(payload.shippingAddress).trim().length > 0
      ? String(payload.shippingAddress).trim()
      : null;

  const shippingPhone =
    payload.shippingPhone != null && String(payload.shippingPhone).trim().length > 0
      ? String(payload.shippingPhone).trim()
      : customerRow.phone != null
        ? String(customerRow.phone).trim() || null
        : null;

  const wompiRef = `POS:${paymentMethod}`;

  const { data: orderRow, error: oErr } = await supabase
    .from("orders")
    .insert({
      status: "paid",
      customer_name: String(customerRow.name ?? "Cliente"),
      customer_email: customerEmail,
      customer_id: customerId,
      total_cents: totalCents,
      currency: "COP",
      wompi_reference: wompiRef,
      shipping_address: shippingAddress,
      shipping_phone: shippingPhone,
    })
    .select("id")
    .single();

  if (oErr || !orderRow?.id) {
    redirectError("db");
  }

  const orderId = String(orderRow.id);

  const itemRows = lines.map((l) => {
    const p = productById.get(l.productId)!;
    const base = Math.max(0, Math.floor(Number(p.price_cents ?? 0)));
    const unitFinal = unitFinalCents(
      base,
      Boolean(p.has_vat),
      Math.max(0, Number(p.vat_percent ?? 0)),
    );
    return {
      order_id: orderId,
      product_id: l.productId,
      quantity: l.quantity,
      unit_price_cents: unitFinal,
      product_name_snapshot: String(p.name ?? "Producto"),
    };
  });

  const { error: iErr } = await supabase.from("order_items").insert(itemRows);

  if (iErr) {
    await supabase.from("orders").delete().eq("id", orderId);
    redirectError("db");
  }

  const stockRollback: { id: string; prev: number }[] = [];
  for (const [pid, qty] of qtyByProduct) {
    const p = productById.get(pid)!;
    const prev = Number(p.stock_local ?? 0);
    const next = Math.max(0, prev - qty);
    const { error: uErr } = await supabase
      .from("products")
      .update({ stock_local: next })
      .eq("id", pid);
    if (uErr) {
      for (const r of stockRollback) {
        await supabase.from("products").update({ stock_local: r.prev }).eq("id", r.id);
      }
      await supabase.from("orders").delete().eq("id", orderId);
      redirectError("db");
    }
    stockRollback.push({ id: pid, prev });
  }

  const totalFormatted = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(totalCents / 100);

  await logAdminActivity(supabase, {
    actorId: user.id,
    actionType: "sale_created",
    entityType: "order",
    entityId: orderId,
    summary: `Venta a ${String(customerRow.name ?? "Cliente")} · ${totalFormatted}`,
    metadata: {
      customer_id: customerId,
      subtotal_cents: subtotalCents,
      vat_cents: vatCents,
      total_cents: totalCents,
      payment_method: paymentMethod,
      line_items: lines.length,
    },
  });
  revalidatePath("/admin/actividades");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/ventas");
  revalidatePath(`/admin/customers/${customerId}`);
  redirect(`/admin/orders/${orderId}`);
}
