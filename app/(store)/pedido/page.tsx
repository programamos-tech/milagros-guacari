import Link from "next/link";
import { notFound } from "next/navigation";
import {
  StoreOrderDetailPanel,
} from "@/components/store/StoreOrderDetailPanel";
import type { TransferOrderLine } from "@/components/store/TransferenciaCheckoutPanel";
import { getTransferBankInstructions } from "@/lib/transfer-bank-instructions";
import { buildStoreOrderTrackingUrl } from "@/lib/store-order-tracking-url";
import { formatStoreDateTime } from "@/lib/store-datetime-format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Detalle del pedido",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PedidoSeguimientoPage({ searchParams }: Props) {
  const sp = await searchParams;
  const orderId = typeof sp.order_id === "string" ? sp.order_id.trim() : "";
  const token = typeof sp.t === "string" ? sp.t.trim() : "";
  if (!orderId || !token) notFound();

  const supabase = createSupabaseServiceClient();
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, checkout_payment_method, transfer_session_token, status, total_cents, customer_name, customer_email, shipping_address, shipping_city, shipping_postal_code, shipping_phone, created_at",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!order) notFound();
  if (String(order.transfer_session_token) !== token) notFound();

  const checkoutPm = String(order.checkout_payment_method ?? "");
  if (checkoutPm !== "transfer") notFound();

  const sessionSb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sessionSb.auth.getUser();

  let showAccountLinks = false;
  let showRegisterModal = true;
  if (user?.email) {
    const { data: adminProf } = await sessionSb
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    showRegisterModal = false;
    showAccountLinks = !adminProf;
  }

  const { data: itemRows } = await supabase
    .from("order_items")
    .select("id, quantity, unit_price_cents, product_name_snapshot")
    .eq("order_id", orderId);

  const orderLines: TransferOrderLine[] = (itemRows ?? []).map((line) => ({
    id: String(line.id),
    name: String(line.product_name_snapshot ?? "Producto"),
    quantity: Math.max(1, Number(line.quantity ?? 1)),
    unitPriceCents: Math.max(0, Number(line.unit_price_cents ?? 0)),
  }));

  const { count: proofCount } = await supabase
    .from("order_transfer_proofs")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId);

  const trackingUrl = buildStoreOrderTrackingUrl(orderId, token);
  const instructions = getTransferBankInstructions();
  const createdAtLabel = formatStoreDateTime(String(order.created_at), {
    dateStyle: "full",
    timeStyle: "short",
  });

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-white">
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:pb-14 lg:pt-10">
        <nav
          aria-label="Migas de pan"
          className="mb-6 text-[11px] uppercase tracking-[0.12em] text-stone-400"
        >
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li>
              <Link href="/" className="transition hover:text-stone-800">
                Inicio
              </Link>
            </li>
            <li aria-hidden className="text-stone-300">
              /
            </li>
            <li>
              <Link href="/checkout" className="transition hover:text-stone-800">
                Bolsa
              </Link>
            </li>
            <li aria-hidden className="text-stone-300">
              /
            </li>
            <li className="text-stone-600">Pedido</li>
          </ol>
        </nav>

        <h1 className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--store-brand)] sm:text-[15px] sm:tracking-[0.26em]">
          Detalle del pedido
        </h1>

        <div className="mt-8">
          <StoreOrderDetailPanel
            orderId={orderId}
            token={token}
            trackingUrl={trackingUrl}
            status={String(order.status)}
            createdAtLabel={createdAtLabel}
            totalCents={Number(order.total_cents ?? 0)}
            customerName={String(order.customer_name ?? "")}
            customerEmail={String(order.customer_email ?? "")}
            shippingPhone={order.shipping_phone ? String(order.shipping_phone) : null}
            shippingAddress={order.shipping_address ? String(order.shipping_address) : null}
            shippingCity={order.shipping_city ? String(order.shipping_city) : null}
            shippingPostalCode={
              order.shipping_postal_code ? String(order.shipping_postal_code) : null
            }
            orderLines={orderLines}
            instructions={instructions}
            isGuest={showRegisterModal}
            showAccountLinks={showAccountLinks}
            proofCount={proofCount ?? 0}
          />
        </div>
      </div>
    </div>
  );
}
