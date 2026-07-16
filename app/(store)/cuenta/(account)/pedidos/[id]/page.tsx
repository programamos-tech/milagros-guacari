import Link from "next/link";
import { notFound } from "next/navigation";
import { StoreOrderDetailPanel } from "@/components/store/StoreOrderDetailPanel";
import { getTransferBankInstructions } from "@/lib/transfer-bank-instructions";
import { buildStoreOrderTrackingUrl } from "@/lib/store-order-tracking-url";
import { formatStoreDateTime } from "@/lib/store-datetime-format";
import { loadStoreOrderDetailForAccountUser } from "@/lib/store-order-detail-data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Detalle del pedido",
};

export default async function CuentaPedidoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await loadStoreOrderDetailForAccountUser(id);
  if (!order) notFound();

  const token = order.transferSessionToken;
  const trackingUrl =
    token && order.checkoutPaymentMethod === "transfer"
      ? buildStoreOrderTrackingUrl(order.id, token)
      : null;
  const instructions = getTransferBankInstructions();
  const createdAtLabel = formatStoreDateTime(order.createdAt, {
    dateStyle: "full",
    timeStyle: "short",
  });

  return (
    <div className="space-y-6">
      <nav aria-label="Migas de pan" className="text-sm text-stone-500">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li>
            <Link
              href="/cuenta/pedidos"
              className="hover:text-[var(--store-accent)] hover:underline"
            >
              Mis pedidos
            </Link>
          </li>
          <li aria-hidden className="text-stone-300">
            /
          </li>
          <li className="font-medium text-stone-700">Detalle</li>
        </ol>
      </nav>

      <StoreOrderDetailPanel
        orderId={order.id}
        token={token}
        trackingUrl={trackingUrl}
        status={order.status}
        fulfillmentStatus={order.fulfillmentStatus}
        checkoutPaymentMethod={order.checkoutPaymentMethod}
        createdAtLabel={createdAtLabel}
        totalCents={order.totalCents}
        customerName={order.customerName}
        customerEmail={order.customerEmail}
        shippingPhone={order.shippingPhone}
        shippingAddress={order.shippingAddress}
        shippingCity={order.shippingCity}
        shippingNeighborhood={order.shippingNeighborhood}
        shippingReference={order.shippingReference}
        shippingPostalCode={order.shippingPostalCode}
        shippingCents={order.shippingCents}
        orderLines={order.orderLines}
        instructions={instructions}
        isGuest={false}
        showAccountLinks
        proofCount={order.proofCount}
      />
    </div>
  );
}
