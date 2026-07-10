"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  TransferenciaCheckoutPanel,
  type TransferOrderLine,
} from "@/components/store/TransferenciaCheckoutPanel";
import { StoreOrderTrackingLink } from "@/components/store/StoreOrderTrackingLink";
import { StorePostCheckoutRegisterModal } from "@/components/store/StorePostCheckoutRegisterModal";
import type { TransferBankInstructions } from "@/lib/transfer-bank-instructions";
import { formatCop } from "@/lib/money";
import {
  isOrderFulfillmentStatus,
  orderFulfillmentBadgeClass,
  storeOrderTrackingHint,
  storeOrderTrackingLabel,
} from "@/lib/order-fulfillment";

const TRANSFER_SECTION_ID = "pago-comprobante";

type Props = {
  orderId: string;
  token: string;
  trackingUrl: string;
  status: string;
  fulfillmentStatus: string | null;
  checkoutPaymentMethod: string | null;
  createdAtLabel: string;
  totalCents: number;
  customerName: string;
  customerEmail: string;
  shippingPhone: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingPostalCode: string | null;
  shippingCents?: number;
  orderLines: TransferOrderLine[];
  instructions: TransferBankInstructions;
  isGuest: boolean;
  showAccountLinks: boolean;
  proofCount: number;
};

function statusBadgeClass(
  status: string,
  fulfillmentStatus: string | null,
  checkoutPaymentMethod: string | null,
): string {
  if (
    checkoutPaymentMethod === "transfer" &&
    fulfillmentStatus &&
    isOrderFulfillmentStatus(fulfillmentStatus)
  ) {
    return `border-transparent ${orderFulfillmentBadgeClass(fulfillmentStatus)}`;
  }
  switch (status) {
    case "paid":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "cancelled":
    case "failed":
      return "border-red-200 bg-red-50 text-red-900";
    default:
      return "border-stone-200 bg-stone-50 text-stone-800";
  }
}

export function StoreOrderDetailPanel({
  orderId,
  token,
  trackingUrl,
  status,
  fulfillmentStatus: initialFulfillmentStatus,
  checkoutPaymentMethod,
  createdAtLabel,
  totalCents,
  customerName,
  customerEmail,
  shippingPhone,
  shippingAddress,
  shippingCity,
  shippingPostalCode,
  shippingCents = 0,
  orderLines,
  instructions,
  isGuest,
  showAccountLinks,
  proofCount: initialProofCount,
}: Props) {
  const [proofCount, setProofCount] = useState(initialProofCount);
  const [paymentStatus, setPaymentStatus] = useState(status);
  const [fulfillmentStatus, setFulfillmentStatus] = useState(initialFulfillmentStatus);
  const [showScrollHint, setShowScrollHint] = useState(true);

  useEffect(() => {
    setProofCount(initialProofCount);
  }, [initialProofCount]);
  useEffect(() => {
    setPaymentStatus(status);
    setFulfillmentStatus(initialFulfillmentStatus);
  }, [status, initialFulfillmentStatus]);

  const onProofUploaded = useCallback((count: number) => {
    setProofCount(count);
    setPaymentStatus("paid");
    setFulfillmentStatus("preparing");
  }, []);

  const showTransferSection =
    checkoutPaymentMethod === "transfer" &&
    fulfillmentStatus !== "shipped" &&
    fulfillmentStatus !== "completed" &&
    (fulfillmentStatus === "awaiting_payment" ||
      fulfillmentStatus === "preparing" ||
      (fulfillmentStatus === null && paymentStatus === "pending"));

  const needsProofHint = showTransferSection && proofCount === 0;

  useEffect(() => {
    if (!needsProofHint) {
      setShowScrollHint(false);
      return;
    }
    setShowScrollHint(true);
    const target = document.getElementById(TRANSFER_SECTION_ID);
    if (!target) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setShowScrollHint(false);
      },
      { threshold: 0.28, rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(target);
    return () => io.disconnect();
  }, [needsProofHint]);

  function scrollToTransfer() {
    const el = document.getElementById(TRANSFER_SECTION_ID);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const displayStatus = storeOrderTrackingLabel({
    paymentStatus,
    fulfillmentStatus,
    checkoutPaymentMethod,
    proofCount,
  });
  const displayHint = storeOrderTrackingHint({
    paymentStatus,
    fulfillmentStatus,
    checkoutPaymentMethod,
    proofCount,
  });
  const shortRef = orderId.slice(0, 8);

  return (
    <>
      <div className="space-y-8">
        <header className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
            Pedido {shortRef}…
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold text-[var(--store-brand)] sm:text-2xl">
              Tu pedido está registrado
            </h2>
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusBadgeClass(paymentStatus, fulfillmentStatus, checkoutPaymentMethod)}`}
            >
              {displayStatus}
            </span>
          </div>
          <p className="text-sm text-stone-600">{createdAtLabel}</p>
          <p className="max-w-2xl text-sm leading-relaxed text-stone-600">
            {displayHint}
          </p>
          {needsProofHint ? (
            <p className="max-w-2xl rounded-xl border border-[var(--store-accent)]/30 bg-[#fff8fb] px-3 py-2.5 text-sm font-medium text-stone-800">
              Para finalizar tu pedido debes transferir y{" "}
              <strong className="text-[var(--store-brand)]">enviar el comprobante de pago</strong>
              . Baja y completa el paso de transferencia.
            </p>
          ) : null}
          {proofCount > 0 && fulfillmentStatus === "preparing" ? (
            <p
              className="max-w-2xl rounded-lg border border-emerald-200/90 bg-emerald-50/90 px-3 py-2 text-sm font-medium text-emerald-900"
              role="status"
            >
              Recibimos tu comprobante ({proofCount}{" "}
              {proofCount === 1 ? "archivo" : "archivos"}). Te confirmaremos el pago pronto.
            </p>
          ) : null}
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8 lg:items-start">
          <div className="space-y-6">
            <section className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--store-brand)]">
                Información de la compra
              </h3>
              <dl className="mt-4 space-y-3 text-sm text-stone-700">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                    Nombre
                  </dt>
                  <dd className="mt-0.5">{customerName}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                    Email
                  </dt>
                  <dd className="mt-0.5 break-all">{customerEmail}</dd>
                </div>
                {shippingPhone ? (
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                      Teléfono
                    </dt>
                    <dd className="mt-0.5">{shippingPhone}</dd>
                  </div>
                ) : null}
                {shippingAddress ? (
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                      Envío
                    </dt>
                    <dd className="mt-0.5">
                      {shippingAddress}
                      {shippingCity ? `, ${shippingCity}` : ""}
                      {shippingPostalCode ? ` · ${shippingPostalCode}` : ""}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                    Forma de pago
                  </dt>
                  <dd className="mt-0.5">Transferencia bancaria</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-xl border border-stone-200 bg-stone-50/60 p-4 sm:p-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--store-brand)]">
                Detalle del pedido
              </h3>
              <ul className="mt-3 divide-y divide-stone-100">
                {orderLines.map((line) => (
                  <li
                    key={line.id}
                    className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug text-stone-900">
                        {line.name}
                      </p>
                      <p className="mt-0.5 text-xs text-stone-500">
                        {line.quantity} × {formatCop(line.unitPriceCents)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium tabular-nums text-stone-900">
                      {formatCop(line.unitPriceCents * line.quantity)}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="mt-3 space-y-2 border-t border-stone-200 pt-3 text-sm text-stone-700">
                {shippingCents > 0 ? (
                  <div className="flex items-center justify-between gap-3">
                    <span>Envío</span>
                    <span className="tabular-nums">{formatCop(shippingCents)}</span>
                  </div>
                ) : shippingCity ? (
                  <div className="flex items-center justify-between gap-3">
                    <span>Envío</span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Gratis
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between text-base font-semibold text-stone-900">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCop(totalCents)}</span>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <StoreOrderTrackingLink url={trackingUrl} />

            {!isGuest && showAccountLinks ? (
              <div className="rounded-xl border border-stone-200 bg-[#f4f4f3] p-4 text-sm text-stone-700">
                <p>
                  También puedes ver este pedido en{" "}
                  <Link
                    href={`/cuenta/pedidos/${orderId}`}
                    className="font-medium text-[var(--store-accent)] underline underline-offset-2"
                  >
                    tu cuenta
                  </Link>
                  .
                </p>
              </div>
            ) : null}

            {needsProofHint ? (
              <button
                type="button"
                onClick={scrollToTransfer}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--store-accent)] bg-[var(--store-accent)] px-4 py-3.5 text-left text-white transition hover:bg-[var(--store-accent-hover)]"
              >
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.14em]">
                    Siguiente paso
                  </span>
                  <span className="mt-0.5 block text-sm font-medium leading-snug text-white/95">
                    Enviar comprobante de pago
                  </span>
                </span>
                <ChevronDown
                  className="size-6 shrink-0 animate-bounce"
                  strokeWidth={1.75}
                  aria-hidden
                />
              </button>
            ) : null}
          </div>
        </div>

        {showTransferSection ? (
          <section
            id={TRANSFER_SECTION_ID}
            className="scroll-mt-28 border-t border-stone-200 pt-10"
          >
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--store-brand)]">
              Pago por transferencia
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
              {proofCount > 0
                ? "Puedes subir otro comprobante si lo necesitas. Guarda el enlace de seguimiento para ver el progreso."
                : "Para confirmar tu pedido es obligatorio transferir el valor exacto y subir el comprobante. Tienes ventanas de 2 minutos para cada intento de subida."}
            </p>
            <div className="mt-6">
              <TransferenciaCheckoutPanel
                orderId={orderId}
                token={token}
                totalCents={totalCents}
                customerName={customerName}
                instructions={instructions}
                orderLines={orderLines}
                embedded
                initialProofCount={proofCount}
                onProofUploaded={onProofUploaded}
              />
            </div>
          </section>
        ) : null}

        <div className="flex flex-wrap gap-3 border-t border-stone-200 pt-8">
          <Link
            href="/products"
            className="inline-flex items-center justify-center border border-[var(--store-accent)] bg-[var(--store-accent)] px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--store-accent-hover)]"
          >
            Seguir comprando
          </Link>
          {!isGuest && showAccountLinks ? (
            <Link
              href="/cuenta/pedidos"
              className="inline-flex items-center justify-center border border-stone-300 bg-white px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-700 transition hover:bg-stone-50"
            >
              Mis pedidos
            </Link>
          ) : null}
        </div>
      </div>

      {needsProofHint && showScrollHint ? (
        <button
          type="button"
          onClick={scrollToTransfer}
          className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[var(--store-accent)] bg-white/95 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--store-accent)] shadow-[0_10px_30px_-12px_rgb(24_24_27/0.35)] backdrop-blur-sm transition hover:bg-[var(--store-accent)] hover:text-white"
          aria-label="Bajar para enviar el comprobante de pago"
        >
          Enviar comprobante
          <ChevronDown className="size-4 animate-bounce" strokeWidth={2} aria-hidden />
        </button>
      ) : null}

      {isGuest ? <StorePostCheckoutRegisterModal orderId={orderId} open /> : null}
    </>
  );
}
