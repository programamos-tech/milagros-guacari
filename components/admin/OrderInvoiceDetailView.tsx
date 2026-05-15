import Link from "next/link";
import {
  OrderInvoicePrintButton,
  OrderInvoiceStatusSelect,
} from "@/components/admin/OrderInvoiceHeaderControls";
import { adminOwnerDisplayName } from "@/lib/admin-owner";
import {
  invoiceLegalName,
  invoiceTaxNit,
  invoiceTradeName,
  storeBrand,
  storeSupportEmail,
  storeSupportPhone,
  storeTaxRegime,
} from "@/lib/brand";
import { formatCop } from "@/lib/money";
import {
  formatStoreInvoiceDateNumeric,
  formatStoreInvoiceDateTime,
} from "@/lib/store-datetime-format";
import {
  ventaEstadoBadge,
  ventaFormaPagoBadge,
  ventaPagoRecibidoBadge,
} from "@/lib/ventas-sales";

const labelClass =
  "text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500";

type Line = {
  id: string;
  name: string;
  reference: string | null;
  quantity: number;
  unitPriceCents: number;
  lineDiscountPercent: number | null;
  lineDiscountAmountCents: number;
};

function lineDiscountHint(line: Line): string | null {
  if (line.lineDiscountPercent != null && line.lineDiscountPercent > 0) {
    return `Descuento ${line.lineDiscountPercent}% (neto de línea)`;
  }
  if (line.lineDiscountAmountCents > 0) {
    return `Descuento ${formatCop(line.lineDiscountAmountCents)} (neto de línea)`;
  }
  return null;
}

export type OrderInvoiceDetailViewProps = {
  orderId: string;
  invoiceRef: string;
  status: string;
  customerName: string;
  customerEmail: string;
  totalCents: number;
  createdAt: string;
  wompiReference: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingPhone: string | null;
  /** Motivo registrado al anular desde el panel. */
  cancellationReason: string | null;
  lines: Line[];
  transferProofAttachments?: {
    signedUrl: string;
    createdAt: string;
    filename: string | null;
  }[];
  checkoutPaymentMethod?: string | null;
  /** Enlace al listado Ventas (p. ej. misma página y filtros). */
  ventasListHref?: string;
};

function IconClock({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.65}
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6l3.5 2" />
    </svg>
  );
}

function IconUser({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.65}
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconStore({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.65}
      className={className}
      aria-hidden
    >
      <path d="M3 10h18v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" strokeLinejoin="round" />
      <path d="M3 10V8l3-5h12l3 5v2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconBuilding({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.65}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12h12" />
      <path d="M6 16h12" />
      <path d="M10 6h4" />
      <path d="M10 22v-4h4v4" />
    </svg>
  );
}

function IconSpark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.65}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M9.5 2 12 5.5 16 4l-2.5 4L20 12l-10.5 1.5L7 22l-2.5-6L2 12l5-2.5L9.5 2Z" />
    </svg>
  );
}

function formatInvoiceDate(iso: string): string {
  return formatStoreInvoiceDateTime(iso);
}

function formatInvoiceDateShort(iso: string): string {
  return formatStoreInvoiceDateNumeric(iso);
}

export function OrderInvoiceDetailView(props: OrderInvoiceDetailViewProps) {
  const {
    orderId,
    invoiceRef,
    status,
    customerName,
    customerEmail,
    totalCents,
    createdAt,
    wompiReference,
    shippingAddress,
    shippingCity,
    shippingPhone,
    cancellationReason,
    lines,
    transferProofAttachments = [],
    checkoutPaymentMethod = null,
    ventasListHref = "/admin/ventas",
  } = props;

  const pagoBadge = ventaFormaPagoBadge(wompiReference, {
    checkoutPaymentMethod: checkoutPaymentMethod ?? undefined,
  });
  const pagoRecibido = ventaPagoRecibidoBadge(status);
  const docEstado = ventaEstadoBadge(status);

  const subtotalLines = lines.reduce(
    (s, l) => s + l.unitPriceCents * l.quantity,
    0,
  );

  const hasShipping =
    Boolean(shippingAddress?.trim()) || Boolean(shippingCity?.trim());
  const ubicacionLine = hasShipping
    ? [shippingCity, shippingAddress].filter(Boolean).join(" · ")
    : "Retiro en tienda";

  const th =
    "px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500 md:px-5";

  return (
    <div className="invoice-ticket-print w-full min-w-0 max-w-none space-y-6 px-3 sm:px-4 md:px-5 print:mx-auto print:max-w-[72mm] print:space-y-3 print:bg-white print:px-0 print:text-zinc-900 print:leading-relaxed dark:print:bg-white">
      <nav className="text-sm text-zinc-500 print:hidden dark:text-zinc-400">
        <Link
          href={ventasListHref}
          className="font-medium hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Ventas
        </Link>
        <span className="mx-2 text-zinc-300 dark:text-zinc-600">/</span>
        <span className="text-zinc-800 dark:text-zinc-200 print:text-zinc-800">
          Factura #{invoiceRef}
        </span>
      </nav>

      <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-[0_1px_0_0_rgb(24_24_27/0.04)] dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-none sm:p-6 md:p-7 print:rounded-none print:border-zinc-900 print:p-3 print:shadow-none dark:print:border-zinc-900 dark:print:bg-white">
        <div className="hidden print:mb-2.5 print:block print:border-2 print:border-black print:p-2.5 print:text-black">
          <p className="text-center text-[14px] font-bold leading-tight tracking-tight">
            {invoiceLegalName}
          </p>
          <p className="mt-2 text-center text-[11px] font-semibold leading-snug">
            NIT: {invoiceTaxNit} — {storeTaxRegime}
          </p>
          <div className="my-2.5 border-t-2 border-black" />
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.14em]">
            Factura de venta
          </p>
          <div className="mt-2 flex justify-between gap-2 border-t border-dashed border-zinc-800 pt-2 text-[11px] font-bold">
            <span>No. #{invoiceRef}</span>
            <span className="shrink-0 tabular-nums">{formatInvoiceDateShort(createdAt)}</span>
          </div>
          <p className="mt-2 text-center text-[11px] font-semibold">Tel. {storeSupportPhone}</p>
          {storeSupportEmail ? (
            <p className="text-center text-[11px] font-semibold break-words">{storeSupportEmail}</p>
          ) : null}
        </div>

        <div className="hidden print:mb-2.5 print:block print:border-2 print:border-black print:px-2.5 print:py-2 print:text-[11px] print:leading-snug print:text-black">
          <p>
            <span className="font-bold">Cliente:</span> {customerName}
          </p>
          {customerEmail && !customerEmail.includes("@local.invalid") ? (
            <p className="mt-1 break-words">
              <span className="font-bold">Correo:</span> {customerEmail}
            </p>
          ) : null}
          <p className="mt-1">
            <span className="font-bold">Entrega:</span> {ubicacionLine}
          </p>
          <p className="mt-1">
            <span className="font-bold">Tienda:</span> {invoiceTradeName}
          </p>
          <p className="mt-1">
            <span className="font-bold">Vendedor:</span> {adminOwnerDisplayName}
          </p>
          {shippingPhone ? (
            <p className="mt-1">
              <span className="font-bold">Tel. pedido:</span> {shippingPhone}
            </p>
          ) : null}
          <p className="mt-1">
            <span className="font-bold">Estado factura:</span> {docEstado.label}
          </p>
          <p className="mt-1">
            <span className="font-bold">Pago:</span> {pagoRecibido.label} · {pagoBadge.label}
          </p>
        </div>

        <div className="hidden print:mb-3 print:block print:border-2 print:border-black print:px-2 print:py-2.5 print:text-black">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.16em]">Total</p>
          <p className="mt-1 text-center text-xl font-bold tabular-nums leading-none tracking-tight">
            {formatCop(totalCents)}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 print:hidden">
          <h1 className="min-w-0 flex-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl md:text-3xl">
            Factura #{invoiceRef}
          </h1>
          <Link
            href={ventasListHref}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 print:hidden"
            aria-label="Volver a ventas"
          >
            <svg
              viewBox="0 0 24 24"
              width={20}
              height={20}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M15 18 9 12l6-6" />
            </svg>
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 text-sm text-zinc-700 print:hidden dark:text-zinc-300 sm:gap-4 md:grid-cols-2 md:gap-x-8 md:gap-y-3 xl:flex xl:flex-row xl:flex-wrap xl:gap-x-10 xl:gap-y-3">
          <p className="flex min-w-0 items-start gap-2 sm:items-center">
            <IconClock className="mt-0.5 size-4 shrink-0 text-zinc-400 dark:text-zinc-500 sm:mt-0" />
            <span className="min-w-0 leading-snug">{formatInvoiceDate(createdAt)}</span>
          </p>
          <p className="flex min-w-0 items-start gap-2 sm:items-center">
            <IconUser className="mt-0.5 size-4 shrink-0 text-zinc-400 dark:text-zinc-500 sm:mt-0" />
            <span className="min-w-0 break-words leading-snug">
              {customerName}
              {customerEmail ? (
                <span className="text-zinc-500 dark:text-zinc-400"> · {customerEmail}</span>
              ) : null}
            </span>
          </p>
          <p className="flex min-w-0 items-start gap-2 sm:items-center">
            <IconStore className="mt-0.5 size-4 shrink-0 text-zinc-400 dark:text-zinc-500 sm:mt-0" />
            <span className="min-w-0 break-words leading-snug">
              <span className="text-zinc-500 dark:text-zinc-400">Tienda · </span>
              {storeBrand}
            </span>
          </p>
          <p className="flex min-w-0 items-start gap-2 sm:items-center">
            <IconBuilding className="mt-0.5 size-4 shrink-0 text-zinc-400 dark:text-zinc-500 sm:mt-0" />
            <span className="min-w-0 break-words leading-snug">{ubicacionLine}</span>
          </p>
          <p className="flex min-w-0 items-start gap-2 sm:items-center md:col-span-2 xl:col-span-1">
            <IconSpark className="mt-0.5 size-4 shrink-0 text-zinc-400 dark:text-zinc-500 sm:mt-0" />
            <span className="min-w-0 break-words leading-snug">{adminOwnerDisplayName}</span>
          </p>
        </div>

        {shippingPhone ? (
          <p className="mt-3 break-words text-sm text-zinc-600 print:hidden dark:text-zinc-400">
            Tel. <span className="font-medium text-zinc-800 dark:text-zinc-200">{shippingPhone}</span>
          </p>
        ) : null}

        {status === "cancelled" && cancellationReason?.trim() ? (
          <div className="mt-5 rounded-xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm text-red-900 print:mt-3 print:rounded-md print:px-2 print:py-2 print:text-[10px] dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100 print:border-red-800 print:bg-red-50">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">
              Motivo de anulación
            </p>
            <p className="mt-1 whitespace-pre-wrap">{cancellationReason.trim()}</p>
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-5 border-t border-zinc-100 pt-6 dark:border-zinc-800 sm:grid-cols-2 sm:gap-6 xl:grid-cols-5 xl:gap-6 print:mt-4 print:grid-cols-1 print:gap-3 print:border-t print:border-zinc-300 print:pt-3">
          <div className="min-w-0 print:hidden">
            <p className={labelClass}>Total</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50 sm:text-2xl">
              {formatCop(totalCents)}
            </p>
          </div>
          <div className="min-w-0 print:hidden">
            <p className={labelClass}>Método de pago</p>
            <p className="mt-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${pagoBadge.className}`}
              >
                {pagoBadge.label}
              </span>
            </p>
          </div>
          <div className="min-w-0 print:hidden">
            <p className={labelClass}>Estado del pago</p>
            <p className="mt-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${pagoRecibido.className}`}
              >
                {pagoRecibido.label}
              </span>
            </p>
          </div>
          <div className="min-w-0 print:hidden">
            <p className={labelClass}>Impresión</p>
            <div className="mt-2">
              <OrderInvoicePrintButton />
            </div>
          </div>
          <div className="min-w-0 print:hidden sm:col-span-2 xl:col-span-1 xl:text-right">
            <p className={`${labelClass} xl:text-right`}>Estado de la factura</p>
            <div className="mt-2 xl:ml-auto xl:max-w-[min(100%,220px)]">
              <OrderInvoiceStatusSelect
                orderId={orderId}
                invoiceRef={invoiceRef}
                currentStatus={status}
              />
            </div>
          </div>
        </div>
      </div>

      {status === "pending" &&
      checkoutPaymentMethod === "transfer" &&
      transferProofAttachments.length > 0 ? (
        <div className="rounded-2xl border border-sky-200/90 bg-sky-50/40 p-5 shadow-[0_1px_0_0_rgb(24_24_27/0.04)] dark:border-sky-800/60 dark:bg-sky-950/25 dark:shadow-none md:p-7 print:hidden">
          <p className={labelClass}>Comprobantes de transferencia</p>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Archivos enviados por el cliente mientras el pedido está pendiente de pago.
          </p>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {transferProofAttachments.map((att, idx) => {
              const isPdf =
                (att.filename?.toLowerCase().endsWith(".pdf") ?? false) ||
                att.signedUrl.toLowerCase().includes("application/pdf");
              return (
                <li
                  key={`${att.createdAt}-${idx}`}
                  className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-700/90 dark:bg-zinc-900"
                >
                  <a
                    href={att.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  >
                    {isPdf ? (
                      <div className="flex min-h-[120px] flex-col items-center justify-center gap-2 bg-zinc-50 px-4 py-8 dark:bg-zinc-950/80">
                        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                          PDF
                        </span>
                        <span className="text-xs text-sky-700 underline dark:text-sky-400">
                          Abrir archivo
                        </span>
                      </div>
                    ) : (
                      /* URL firmada de Supabase Storage; `next/image` no aplica sin dominio fijo en remotePatterns. */
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={att.signedUrl}
                        alt={att.filename ? `Comprobante ${att.filename}` : "Comprobante de pago"}
                        className="max-h-56 w-full object-contain bg-zinc-50 dark:bg-zinc-950/50"
                      />
                    )}
                  </a>
                  <div className="border-t border-zinc-100 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    <span className="tabular-nums">{formatInvoiceDate(att.createdAt)}</span>
                    {att.filename ? (
                      <span className="mt-0.5 block truncate font-medium text-zinc-700 dark:text-zinc-300">
                        {att.filename}
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-[0_1px_0_0_rgb(24_24_27/0.04)] dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-none md:p-7 print:rounded-none print:border-zinc-900 print:p-3 print:shadow-none dark:print:border-zinc-900 dark:print:bg-white">
        <p className={`${labelClass} print:text-center print:text-[11px] print:font-bold print:tracking-normal print:text-black`}>
          Productos de la factura
        </p>

        {lines.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">No hay ítems en este pedido.</p>
        ) : (
          <>
            <div className="mt-5 hidden space-y-0 border-y-2 border-black print:block">
              {lines.map((line) => {
                const sub = line.unitPriceCents * line.quantity;
                const ref = line.reference?.trim();
                return (
                  <div
                    key={`print-${line.id}`}
                    className="border-b border-dashed border-zinc-800 py-2.5 text-[11px] last:border-b-0"
                  >
                    <div className="flex justify-between gap-2 font-bold leading-snug text-black">
                      <span className="min-w-0 flex-1 break-words">
                        {line.quantity} × {line.name}
                        {ref ? (
                          <span className="mt-1 block font-mono text-[10px] font-semibold text-zinc-900">
                            ({ref})
                          </span>
                        ) : null}
                        {lineDiscountHint(line) ? (
                          <span className="mt-1 block text-[10px] font-semibold text-zinc-900">
                            {lineDiscountHint(line)}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 tabular-nums text-black">{formatCop(sub)}</span>
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] font-semibold text-zinc-900">
                      <span>P. unit. {formatCop(line.unitPriceCents)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 overflow-x-auto print:hidden">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    <th className={th}>Producto</th>
                    <th className={th}>Cant. pedida</th>
                    <th className={th}>P. unit.</th>
                    <th className={th}>Cant.</th>
                    <th className={`${th} text-right`}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => {
                    const sub = line.unitPriceCents * line.quantity;
                    const ref = line.reference?.trim();
                    return (
                      <tr
                        key={line.id}
                        className="border-b border-zinc-100 bg-white last:border-0 dark:border-zinc-800 dark:bg-zinc-900"
                      >
                        <td className="px-4 py-4 font-medium text-zinc-900 dark:text-zinc-100 md:px-5">
                          <span>{line.name}</span>
                          {ref ? (
                            <span className="mt-0.5 block font-mono text-xs font-normal text-zinc-400 dark:text-zinc-500">
                              ({ref})
                            </span>
                          ) : null}
                          {lineDiscountHint(line) ? (
                            <span className="mt-0.5 block text-xs font-normal text-amber-800 dark:text-amber-500/90">
                              {lineDiscountHint(line)}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 tabular-nums text-zinc-700 dark:text-zinc-300 md:px-5">
                          {line.quantity}
                        </td>
                        <td className="px-4 py-4 tabular-nums text-zinc-700 dark:text-zinc-300 md:px-5">
                          {formatCop(line.unitPriceCents)}
                        </td>
                        <td className="px-4 py-4 tabular-nums text-zinc-700 dark:text-zinc-300 md:px-5">
                          {line.quantity}
                        </td>
                        <td className="px-4 py-4 text-right font-semibold tabular-nums text-zinc-900 dark:text-zinc-100 md:px-5">
                          {formatCop(sub)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end print:break-inside-avoid print:mt-4">
              <div className="w-full max-w-xs rounded-xl border border-zinc-200 bg-zinc-50/80 px-5 py-4 dark:border-zinc-700 dark:bg-zinc-950/80 print:max-w-none print:border-2 print:border-black print:bg-white print:px-2 print:py-3">
                <div className="flex justify-between gap-4 text-sm print:text-[11px]">
                  <span className="font-semibold text-zinc-700 print:text-black">Subtotal productos</span>
                  <span className="font-bold tabular-nums text-zinc-900 print:text-black">
                    {formatCop(subtotalLines)}
                  </span>
                </div>
                <div className="mt-3 flex justify-between gap-4 border-t-2 border-black pt-3 print:border-zinc-800 dark:border-zinc-700/90">
                  <span className="font-bold text-zinc-900 print:text-[11px] print:text-black dark:text-zinc-200">
                    Total a despachar
                  </span>
                  <span className="text-lg font-bold tabular-nums text-zinc-900 print:text-base print:text-black dark:text-zinc-50">
                    {formatCop(totalCents)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <p className="hidden border-t-2 border-black pt-3 text-center text-[11px] font-medium leading-relaxed text-black print:block">
        Productos: {lines.length} ítem{lines.length === 1 ? "" : "s"} · IVA incluido
        <br />
        <span className="mt-2 block text-[12px] font-bold">
          ¡Gracias por su compra! · {invoiceTradeName}
        </span>
      </p>
    </div>
  );
}
