import { randomUUID } from "node:crypto";
import type { TransferOrderLine } from "@/components/store/TransferenciaCheckoutPanel";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const ORDER_SELECT_FULL =
  "id, customer_id, customer_email, checkout_payment_method, transfer_session_token, status, fulfillment_status, total_cents, shipping_cents, customer_name, shipping_address, shipping_city, shipping_neighborhood, shipping_reference, shipping_postal_code, shipping_phone, created_at";

const ORDER_SELECT_WITHOUT_NEIGHBORHOOD =
  "id, customer_id, customer_email, checkout_payment_method, transfer_session_token, status, fulfillment_status, total_cents, shipping_cents, customer_name, shipping_address, shipping_city, shipping_postal_code, shipping_phone, created_at";

export type StoreOrderDetailRecord = {
  id: string;
  status: string;
  fulfillmentStatus: string | null;
  checkoutPaymentMethod: string | null;
  transferSessionToken: string | null;
  totalCents: number;
  shippingCents: number;
  customerName: string;
  customerEmail: string;
  shippingPhone: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingNeighborhood: string | null;
  shippingReference: string | null;
  shippingPostalCode: string | null;
  createdAt: string;
  orderLines: TransferOrderLine[];
  proofCount: number;
};

function mapOrderRow(
  order: Record<string, unknown>,
  orderLines: TransferOrderLine[],
  proofCount: number,
): StoreOrderDetailRecord {
  return {
    id: String(order.id),
    status: String(order.status ?? ""),
    fulfillmentStatus:
      order.fulfillment_status != null ? String(order.fulfillment_status) : null,
    checkoutPaymentMethod:
      order.checkout_payment_method != null
        ? String(order.checkout_payment_method)
        : null,
    transferSessionToken:
      order.transfer_session_token != null
        ? String(order.transfer_session_token)
        : null,
    totalCents: Number(order.total_cents ?? 0),
    shippingCents: Number(order.shipping_cents ?? 0),
    customerName: String(order.customer_name ?? ""),
    customerEmail: String(order.customer_email ?? ""),
    shippingPhone: order.shipping_phone ? String(order.shipping_phone) : null,
    shippingAddress: order.shipping_address
      ? String(order.shipping_address)
      : null,
    shippingCity: order.shipping_city ? String(order.shipping_city) : null,
    shippingNeighborhood: order.shipping_neighborhood
      ? String(order.shipping_neighborhood)
      : null,
    shippingReference: order.shipping_reference
      ? String(order.shipping_reference)
      : null,
    shippingPostalCode: order.shipping_postal_code
      ? String(order.shipping_postal_code)
      : null,
    createdAt: String(order.created_at ?? ""),
    orderLines,
    proofCount,
  };
}

async function fetchOrderRow(orderId: string) {
  const supabase = createSupabaseServiceClient();
  const full = await supabase
    .from("orders")
    .select(ORDER_SELECT_FULL)
    .eq("id", orderId)
    .maybeSingle();

  if (!full.error) return full;

  const msg = full.error.message?.toLowerCase() ?? "";
  const missingNeighborhood =
    msg.includes("shipping_neighborhood") || msg.includes("shipping_reference");
  if (!missingNeighborhood) return full;

  return supabase
    .from("orders")
    .select(ORDER_SELECT_WITHOUT_NEIGHBORHOOD)
    .eq("id", orderId)
    .maybeSingle();
}

/**
 * Pedido público con token de transferencia (post-checkout /enlace de seguimiento).
 */
export async function loadStoreOrderDetailByTransferToken(
  orderId: string,
  token: string,
): Promise<StoreOrderDetailRecord | null> {
  const tid = token.trim();
  if (!orderId || !tid) return null;

  const { data: order, error } = await fetchOrderRow(orderId);
  if (error || !order) return null;
  if (String(order.transfer_session_token ?? "") !== tid) return null;

  return loadOrderExtras(order as Record<string, unknown>);
}

/**
 * Pedido del comprador autenticado (cuenta). Verifica vínculo por customer_id o email.
 */
export async function loadStoreOrderDetailForAccountUser(
  orderId: string,
): Promise<StoreOrderDetailRecord | null> {
  if (!orderId) return null;

  const sessionSb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sessionSb.auth.getUser();
  if (!user) return null;

  // Acceso vía RLS: si no puede leer el id, no es su pedido (ni admin).
  const { data: owned, error: ownedErr } = await sessionSb
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .maybeSingle();
  if (ownedErr || !owned) return null;

  const { data: order, error } = await fetchOrderRow(orderId);
  if (error || !order) return null;

  const row = order as Record<string, unknown>;
  let token =
    row.transfer_session_token != null
      ? String(row.transfer_session_token)
      : null;

  // Pedidos transfer sin token: generar uno para poder subir comprobante desde la cuenta.
  if (String(row.checkout_payment_method ?? "") === "transfer" && !token) {
    token = randomUUID();
    const supabase = createSupabaseServiceClient();
    await supabase
      .from("orders")
      .update({ transfer_session_token: token })
      .eq("id", orderId);
    row.transfer_session_token = token;
  }

  return loadOrderExtras(row);
}

async function loadOrderExtras(
  order: Record<string, unknown>,
): Promise<StoreOrderDetailRecord> {
  const orderId = String(order.id);
  const supabase = createSupabaseServiceClient();

  const [{ data: itemRows }, { count: proofCount }] = await Promise.all([
    supabase
      .from("order_items")
      .select("id, quantity, unit_price_cents, product_name_snapshot")
      .eq("order_id", orderId),
    supabase
      .from("order_transfer_proofs")
      .select("id", { count: "exact", head: true })
      .eq("order_id", orderId),
  ]);

  const orderLines: TransferOrderLine[] = (itemRows ?? []).map((line) => ({
    id: String(line.id),
    name: String(line.product_name_snapshot ?? "Producto"),
    quantity: Math.max(1, Number(line.quantity ?? 1)),
    unitPriceCents: Math.max(0, Number(line.unit_price_cents ?? 0)),
  }));

  return mapOrderRow(order, orderLines, proofCount ?? 0);
}
