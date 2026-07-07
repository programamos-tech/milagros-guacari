"use client";

import Link from "next/link";
import {
  TransferenciaCheckoutPanel,
  type TransferOrderLine,
} from "@/components/store/TransferenciaCheckoutPanel";
import { StoreOrderTrackingLink } from "@/components/store/StoreOrderTrackingLink";
import { StorePostCheckoutRegisterModal } from "@/components/store/StorePostCheckoutRegisterModal";
import type { TransferBankInstructions } from "@/lib/transfer-bank-instructions";
import { formatCop } from "@/lib/money";
import {
  storeOrderStatusHint,
  storeOrderStatusLabel,
} from "@/lib/store-order-status";

type Props = {
  orderId: string;
  token: string;
  trackingUrl: string;
  status: string;
  createdAtLabel: string;
  totalCents: number;
  customerName: string;
  customerEmail: string;
  shippingPhone: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingPostalCode: string | null;
  orderLines: TransferOrderLine[];
  instructions: TransferBankInstructions;
  isGuest: boolean;
  showAccountLinks: boolean;
  proofCount: number;
};

function statusBadgeClass(status: string): string {
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
  createdAtLabel,
  totalCents,
  customerName,
  customerEmail,
  shippingPhone,
  shippingAddress,
  shippingCity,
  shippingPostalCode,
  orderLines,
  instructions,
  isGuest,
  showAccountLinks,
  proofCount,
}: Props) {
  const isPendingTransfer = status === "pending";
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
              className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusBadgeClass(status)}`}
            >
              {storeOrderStatusLabel(status)}
            </span>
          </div>
          <p className="text-sm text-stone-600">{createdAtLabel}</p>
          <p className="max-w-2xl text-sm leading-relaxed text-stone-600">
            {storeOrderStatusHint(status)}
          </p>
          {proofCount > 0 && isPendingTransfer ? (
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
              <div className="mt-3 flex items-center justify-between border-t border-stone-200 pt-3 text-base font-semibold text-stone-900">
                <span>Total</span>
                <span className="tabular-nums">{formatCop(totalCents)}</span>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <StoreOrderTrackingLink url={trackingUrl} />

            {!isGuest && showAccountLinks ? (
              <div className="rounded-xl border border-stone-200 bg-[#f4f4f3] p-4 text-sm text-stone-700">
                <p>
                  También podés ver este pedido en{" "}
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
          </div>
        </div>

        {isPendingTransfer ? (
          <section className="border-t border-stone-200 pt-10">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--store-brand)]">
              Pago por transferencia
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
              Transfiere el valor exacto y sube el comprobante. Tienes ventanas de 2 minutos
              para cada intento de subida.
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

      {isGuest ? <StorePostCheckoutRegisterModal orderId={orderId} open /> : null}
    </>
  );
}
