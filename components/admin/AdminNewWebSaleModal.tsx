"use client";

import Link from "next/link";
import { formatCop } from "@/lib/money";
import type { AdminWebOrderNotification } from "@/lib/admin-web-order-notifications";
import { webOrderPaymentLabel } from "@/lib/admin-web-order-notifications";
import { formatStoreDateTime } from "@/lib/store-datetime-format";
import { ventaNumeroReferencia } from "@/lib/ventas-sales";

export function AdminNewWebSaleModal({
  order,
  onClose,
}: {
  order: AdminWebOrderNotification;
  onClose: () => void;
}) {
  const ref = ventaNumeroReferencia(order.id);
  const detailHref = `/admin/orders/${order.id}`;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/45 backdrop-blur-[1px]"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-new-web-sale-title"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-emerald-200/80 bg-white shadow-2xl dark:border-emerald-900/50 dark:bg-zinc-900"
      >
        <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white px-6 py-5 dark:border-emerald-900/40 dark:from-emerald-950/40 dark:to-zinc-900">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
            Nueva venta web
          </p>
          <h2
            id="admin-new-web-sale-title"
            className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50"
          >
            ¡Llegó un pedido nuevo!
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Factura #{ref} · {webOrderPaymentLabel(order.checkoutPaymentMethod)}
          </p>
        </div>

        <div className="space-y-4 px-6 py-5">
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Cliente
              </dt>
              <dd className="mt-0.5 font-medium text-zinc-900 dark:text-zinc-100">
                {order.customerName}
              </dd>
            </div>
            {order.customerEmail ? (
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  Correo
                </dt>
                <dd className="mt-0.5 break-all text-zinc-700 dark:text-zinc-300">
                  {order.customerEmail}
                </dd>
              </div>
            ) : null}
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  Total
                </dt>
                <dd className="mt-0.5 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {formatCop(order.totalCents)}
                </dd>
              </div>
              <div className="text-right">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  Fecha
                </dt>
                <dd className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                  {formatStoreDateTime(order.createdAt, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </dd>
              </div>
            </div>
          </dl>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cerrar
            </button>
            <Link
              href={detailHref}
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              Ver detalle del pedido
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
