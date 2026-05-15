"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  formatVentaFecha,
  isVentaFisica,
  ventaEstadoBadge,
  ventaFormaPagoBadge,
  ventaNumeroReferencia,
} from "@/lib/ventas-sales";
import { AnimatedCopCents } from "@/components/admin/ReportsAnimatedFigures";

export type VentaOrderRow = {
  id: string;
  status: string;
  customer_name: string;
  total_cents: number;
  created_at: string | null;
  wompi_reference: string | null;
  customer_email: string | null;
  checkout_payment_method?: string | null;
};

function IconStorefront({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.65}
      aria-hidden
    >
      <path d="M3 10h18v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" strokeLinejoin="round" />
      <path d="M3 10V8l3-5h12l3 5v2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 14h6" strokeLinecap="round" />
    </svg>
  );
}

function IconPackage({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.65}
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 16V8l-9-5-9 5v8l9 5 9-5z" />
      <path d="M3.3 7 12 12l8.7-5" />
      <path d="M12 12v9" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden
    >
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

const thClass =
  "px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500 sm:px-4 md:px-5";

export function VentasSalesTable({
  rows,
  orderListReturnHref,
}: {
  rows: VentaOrderRow[];
  /** Si se pasa, el detalle del pedido vuelve a este listado (misma página y filtros). */
  orderListReturnHref?: string;
}) {
  const router = useRouter();

  const orderDetailHref = (orderId: string) =>
    orderListReturnHref
      ? `/admin/orders/${orderId}?returnTo=${encodeURIComponent(orderListReturnHref)}`
      : `/admin/orders/${orderId}`;

  if (rows.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400 sm:px-5">
        No hay ventas que coincidan con los filtros.
      </div>
    );
  }

  const cardClass =
    "flex flex-col rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-sm ring-1 ring-zinc-950/5 transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-700/90 dark:bg-zinc-900 dark:ring-white/[0.06] dark:hover:border-zinc-600 dark:hover:shadow-lg sm:p-4";

  return (
    <>
      {/* Por debajo de xl: tarjetas tipo tablero (una columna); fecha a la izquierda, pago + estado a la derecha. xl+: tabla. */}
      <ul
        role="list"
        className="grid grid-cols-1 gap-3 px-3 pb-3 pt-2 sm:gap-3.5 sm:px-4 sm:pb-4 xl:hidden"
      >
        {rows.map((row, i) => {
          const fisica = isVentaFisica(row.wompi_reference);
          const ref = ventaNumeroReferencia(row.id);
          const estado = ventaEstadoBadge(row.status);
          const pago = ventaFormaPagoBadge(row.wompi_reference, {
            checkoutPaymentMethod: row.checkout_payment_method,
          });
          const href = orderDetailHref(row.id);

          return (
            <li key={row.id} className="min-w-0">
              <Link
                href={href}
                className={`${cardClass} block cursor-pointer no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500`}
                aria-label={`Ver factura ${ref}, ${row.customer_name}`}
              >
                <article>
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex min-w-0 flex-1 items-start gap-2.5">
                      {fisica ? (
                        <IconStorefront className="mt-0.5 size-[22px] shrink-0 text-zinc-400 dark:text-zinc-500" />
                      ) : (
                        <IconPackage className="mt-0.5 size-[22px] shrink-0 text-amber-600" />
                      )}
                      <div className="min-w-0">
                        <p className="font-mono text-base font-bold tabular-nums leading-none text-zinc-900 dark:text-zinc-100 sm:text-[17px]">
                          {ref}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm leading-snug text-zinc-900 dark:text-zinc-100">
                          {row.customer_name}
                        </p>
                      </div>
                    </div>
                    <span
                      className="pointer-events-none inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200/90 bg-white text-zinc-500 shadow-[0_1px_0_0_rgb(24_24_27/0.04)] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400 dark:shadow-none"
                      aria-hidden
                    >
                      <IconEye />
                    </span>
                  </div>
                  <div className="mt-3 flex min-w-0 items-center justify-between gap-2">
                    <span className="min-w-0 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400 sm:text-xs">
                      {formatVentaFecha(row.created_at)}
                    </span>
                    <div className="flex max-w-[58%] shrink-0 flex-wrap items-center justify-end gap-1.5 sm:max-w-[65%]">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:py-1 sm:text-xs ${pago.className}`}
                      >
                        {pago.label}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:py-1 sm:text-xs ${estado.className}`}
                      >
                        {estado.label}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-xl tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-2xl">
                    <AnimatedCopCents
                      cents={Number(row.total_cents ?? 0)}
                      duration={780}
                      delay={Math.min(i * 18, 320)}
                    />
                  </p>
                </article>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* xl+: ancho suficiente para tabla sin scroll molesto junto al sidebar */}
      <div className="hidden overflow-x-auto xl:block">
        <table className="w-full min-w-[700px] text-sm xl:min-w-0">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/80">
              <th className={thClass}>Factura / pedido</th>
              <th className={`${thClass} w-[9rem]`}>Fecha</th>
              <th className={thClass}>Cliente</th>
              <th className={`${thClass} w-[7rem]`}>Pago</th>
              <th className={`${thClass} w-[7rem]`}>Estado</th>
              <th className={`${thClass} w-[7.5rem] text-right`}>Total</th>
              <th className={`${thClass} w-[4rem] text-center`}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const href = orderDetailHref(row.id);
              const fisica = isVentaFisica(row.wompi_reference);
              const ref = ventaNumeroReferencia(row.id);
              const estado = ventaEstadoBadge(row.status);
              const pago = ventaFormaPagoBadge(row.wompi_reference, {
                checkoutPaymentMethod: row.checkout_payment_method,
              });
              return (
                <tr
                  key={row.id}
                  tabIndex={0}
                  aria-label={`Ver factura ${ref}, pedido ${row.customer_name}`}
                  className="cursor-pointer border-b border-zinc-100 bg-white transition hover:bg-zinc-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/80 dark:focus-visible:ring-offset-zinc-900"
                  onClick={() => {
                    router.push(href);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(href);
                    }
                  }}
                >
                  <td className="px-3 py-3.5 sm:px-4 md:px-5">
                    <div className="flex items-center gap-2.5">
                      {fisica ? (
                        <IconStorefront className="size-5 shrink-0 text-zinc-500 dark:text-zinc-400" />
                      ) : (
                        <IconPackage className="size-5 shrink-0 text-amber-600" />
                      )}
                      <span className="font-mono text-xs font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                        {ref}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-zinc-600 dark:text-zinc-400 sm:px-4 md:px-5">
                    {formatVentaFecha(row.created_at)}
                  </td>
                  <td className="min-w-0 max-w-[10rem] truncate px-3 py-3.5 text-zinc-900 dark:text-zinc-100 sm:max-w-[12rem] sm:px-4 md:max-w-[16rem] md:px-5 xl:max-w-none">
                    {row.customer_name}
                  </td>
                  <td className="px-3 py-3.5 sm:px-4 md:px-5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${pago.className}`}
                    >
                      {pago.label}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 sm:px-4 md:px-5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${estado.className}`}
                    >
                      {estado.label}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-right text-sm tabular-nums text-zinc-900 dark:text-zinc-50 sm:px-4 md:px-5">
                    <AnimatedCopCents
                      cents={Number(row.total_cents ?? 0)}
                      duration={780}
                      delay={Math.min(i * 16, 300)}
                    />
                  </td>
                  <td className="px-3 py-3.5 text-center sm:px-4 md:px-5">
                    <Link
                      href={href}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="inline-flex size-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400 dark:shadow-none dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                      aria-label={`Ver detalle del pedido ${ref}`}
                    >
                      <IconEye />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
