import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { deductOrderItemsStock } from "@/lib/storefront-order-stock";
import { verifyWompiEventIntegrity } from "@/lib/wompi";

export const runtime = "nodejs";

function mapTxnStatus(
  status: string | undefined,
): "paid" | "failed" | null {
  if (!status) return null;
  const u = status.toUpperCase();
  if (u === "APPROVED") return "paid";
  if (
    u === "DECLINED" ||
    u === "VOIDED" ||
    u === "ERROR" ||
    u === "CANCELED" ||
    u === "CANCELLED"
  ) {
    return "failed";
  }
  return null;
}

export async function POST(request: Request) {
  const raw = await request.text();
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  if (!verifyWompiEventIntegrity(body)) {
    return new Response("invalid signature", { status: 401 });
  }

  const data = (body as { data?: Record<string, unknown> }).data;
  const transaction = data?.transaction as
    | Record<string, unknown>
    | undefined;
  if (!transaction) {
    return new Response("ok", { status: 200 });
  }

  const txnId = transaction.id != null ? String(transaction.id) : null;
  const reference =
    transaction.reference != null ? String(transaction.reference) : null;
  const paymentLinkId =
    transaction.payment_link_id != null
      ? String(transaction.payment_link_id)
      : transaction.payment_link != null &&
          typeof transaction.payment_link === "object" &&
          "id" in (transaction.payment_link as object)
        ? String((transaction.payment_link as { id: unknown }).id)
        : null;

  const mapped = mapTxnStatus(
    transaction.status != null ? String(transaction.status) : undefined,
  );
  if (!mapped) {
    return new Response("ok", { status: 200 });
  }

  const supabase = createSupabaseServiceClient();

  let orderId: string | null = null;
  if (reference && /^[0-9a-f-]{36}$/i.test(reference)) {
    orderId = reference;
  }
  if (!orderId && paymentLinkId) {
    const { data: row } = await supabase
      .from("orders")
      .select("id")
      .eq("wompi_payment_link_id", paymentLinkId)
      .maybeSingle();
    orderId = (row?.id as string | undefined) ?? null;
  }

  if (!orderId) {
    return new Response("ok", { status: 200 });
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id,status")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    return new Response("ok", { status: 200 });
  }

  if (order.status === "paid" && mapped === "paid") {
    return new Response("ok", { status: 200 });
  }

  const nextStatus = mapped;
  const { error: updErr } = await supabase
    .from("orders")
    .update({
      status: nextStatus,
      wompi_transaction_id: txnId ?? undefined,
      wompi_reference: reference ?? undefined,
    })
    .eq("id", orderId);

  if (updErr) {
    console.error("[wompi webhook] order update", updErr);
    return new Response("db error", { status: 500 });
  }

  if (nextStatus === "paid") {
    const stockResult = await deductOrderItemsStock(supabase, orderId);
    if (!stockResult.ok) {
      console.error("[wompi webhook] stock deduct", stockResult.reason, orderId);
      return new Response("stock deduct error", { status: 500 });
    }
  }

  return new Response("ok", { status: 200 });
}
