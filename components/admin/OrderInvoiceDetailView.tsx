import Link from "next/link";
import {
  OrderInvoicePrintButton,
  OrderInvoiceStatusSelect,
} from "@/components/admin/OrderInvoiceHeaderControls";
import { adminOwnerDisplayName } from "@/lib/admin-owner";
import {
  invoiceLegalName,
  invoiceLogoPath,
  invoiceStoreAddress,
  invoiceStoreCity,
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
  /** Cédula / documento del cliente (perfil), si existe. */
  customerDocumentId?: string | null;
  /** Teléfono: pedido o perfil del cliente. */
  customerPhone?: string | null;
  /** Dirección: envío del pedido o perfil del cliente. */
  customerAddress?: string | null;
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
    customerDocumentId = null,
    customerPhone = null,
    customerAddress = null,
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
  const totalsMatch = subtotalLines === totalCents;

  const hasShipping =
    Boolean(shippingAddress?.trim()) || Boolean(shippingCity?.trim());
  const ubicacionLine = hasShipping
    ? [shippingCity, shippingAddress].filter(Boolean).join(" · ")
    : "Retiro en tienda";

  const printDocumentId = customerDocumentId?.trim() || null;
  const printPhone = (customerPhone ?? shippingPhone)?.trim() || null;
  const printAddress = customerAddress?.trim() || null;

  const th =
    "px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500 md:px-5";

  return (
    <div className="invoice-ticket-print w-full min-w-0 max-w-none space-y-6 px-3 sm:px-4 md:px-5 print:mx-auto print:max-w-[72mm] print:space-y-2 print:bg-white print:px-0 print:py-0 print:text-zinc-900 print:leading-snug dark:print:bg-white">
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

      <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-[0_1px_0_0_rgb(24_24_27/0.04)] dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-none sm:p-6 md:p-7 print:rounded-none print:border-0 print:p-0 print:shadow-none dark:print:border-0 dark:print:bg-white">
        <div className="hidden print:block print:text-[10px] print:leading-snug print:text-black">
          <div className="print:flex print:flex-col print:items-center print:pb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={invoiceLogoPath}
              alt={invoiceTradeName}
              className="print:mb-2 print:h-11 print:w-auto print:max-w-[58mm] print:object-contain"
            />
            <p className="print:text-center print:text-[12px] print:font-bold print:leading-tight">
              {invoiceLegalName}
            </p>
            <p className="print:mt-0.5 print:text-center print:text-[10px] print:font-semibold">
              NIT: {invoiceTaxNit} — {storeTaxRegime}
            </p>
            {invoiceStoreAddress ? (
              <p className="print:mt-1 print:text-center print:text-[10px]">{invoiceStoreAddress}</p>
            ) : null}
            {invoiceStoreCity ? (
              <p className="print:text-center print:text-[10px] print:font-semibold">
                {invoiceStoreCity}
              </p>
            ) : null}
            <p className="print:mt-1 print:text-center print:text-[10px] print:font-semibold">
              TEL: {storeSupportPhone}
            </p>
            <p className="print:mt-2 print:text-center print:text-[10px] print:font-bold">
              Factura #{invoiceRef}
            </p>
            <p className="print:text-center print:text-[10px] print:tabular-nums">
              {formatInvoiceDateShort(createdAt)}
            </p>
          </div>

          <div className="print:my-2 print:border-t print:border-dashed print:border-black" />

          <div className="print:space-y-1 print:px-0.5">
            <p>
              <span className="font-bold">Cliente:</span> {customerName}
            </p>
            {printDocumentId ? (
              <p>
                <span className="font-bold">Cédula:</span> {printDocumentId}
              </p>
            ) : null}
            {printPhone ? (
              <p>
                <span className="font-bold">Teléfono:</span> {printPhone}
              </p>
            ) : null}
            {printAddress ? (
              <p className="print:break-words">
                <span className="font-bold">Dirección:</span> {printAddress}
              </p>
            ) : null}
          </div>
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

        {(printPhone || printDocumentId || printAddress) && (
          <div className="mt-3 space-y-1 text-sm text-zinc-600 print:hidden dark:text-zinc-400">
            {printDocumentId ? (
              <p>
                Cédula{" "}
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{printDocumentId}</span>
              </p>
            ) : null}
            {printPhone ? (
              <p>
                Tel.{" "}
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{printPhone}</span>
              </p>
            ) : null}
            {printAddress ? (
              <p className="break-words">
                Dirección{" "}
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{printAddress}</span>
              </p>
            ) : null}
          </div>
        )}

        {status === "cancelled" && cancellationReason?.trim() ? (
          <div className="mt-5 rounded-xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm text-red-900 print:mt-3 print:rounded-md print:px-2 print:py-2 print:text-[10px] dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100 print:border-red-800 print:bg-red-50">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">
              Motivo de anulación
            </p>
            <p className="mt-1 whitespace-pre-wrap">{cancellationReason.trim()}</p>
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-5 border-t border-zinc-100 pt-6 dark:border-zinc-800 sm:grid-cols-2 sm:gap-6 xl:grid-cols-5 xl:gap-6 print:mt-4 print:grid-cols-1 print:gap-3 print:border-t print:border-zinc-300 print:pt-3">
          {!(totalsMatch && lines.length > 0) ? (
          <div className="min-w-0 print:hidden">
            <p className={labelClass}>Total</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50 sm:text-2xl">
              {formatCop(totalCents)}
            </p>
          </div>
          ) : null}
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

      <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-[0_1px_0_0_rgb(24_24_27/0.04)] dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-none md:p-7 print:rounded-none print:border-0 print:p-0 print:shadow-none dark:print:border-0 dark:print:bg-white">
        <p className={`${labelClass} print:hidden`}>Productos de la factura</p>

        {lines.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">No hay ítems en este pedido.</p>
        ) : (
          <>
            <div className="mt-2 hidden print:block">
              <table className="w-full border-collapse text-[10px] text-black">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="w-8 py-1 text-left font-bold">Cant.</th>
                    <th className="py-1 text-left font-bold">Artículo</th>
                    <th className="w-[4.5rem] py-1 text-right font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => {
                    const sub = line.unitPriceCents * line.quantity;
                    const ref = line.reference?.trim();
                    return (
                      <tr
                        key={`print-${line.id}`}
                        className="border-b border-dashed border-zinc-500 align-top"
                      >
                        <td className="py-1.5 tabular-nums font-semibold">{line.quantity}</td>
                        <td className="py-1.5 pr-1">
                          <span className="block break-words font-medium leading-snug">
                            {line.name}
                          </span>
                          {ref ? (
                            <span className="block font-mono text-[9px] text-zinc-800">Ref. {ref}</span>
                          ) : null}
                        </td>
                        <td className="py-1.5 text-right tabular-nums font-bold">{formatCop(sub)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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

            <div className="mt-6 flex justify-end print:mt-2 print:break-inside-avoid">
              <div className="w-full max-w-xs rounded-xl border border-zinc-200 bg-zinc-50/80 px-5 py-4 dark:border-zinc-700 dark:bg-zinc-950/80 print:max-w-none print:border-0 print:bg-white print:px-0 print:py-0">
                {totalsMatch ? (
                  <div className="flex justify-between gap-4 border-t-2 border-black pt-2 print:pt-2 dark:border-zinc-700/90">
                    <span className="font-bold text-zinc-900 print:text-[12px] print:text-black dark:text-zinc-200">
                      TOTAL
                    </span>
                    <span className="text-lg font-bold tabular-nums text-zinc-900 print:text-[13px] print:text-black dark:text-zinc-50">
                      {formatCop(totalCents)}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between gap-4 text-sm print:text-[11px]">
                      <span className="font-semibold text-zinc-700 print:text-black">
                        Subtotal productos
                      </span>
                      <span className="font-bold tabular-nums text-zinc-900 print:text-black">
                        {formatCop(subtotalLines)}
                      </span>
                    </div>
                    <div className="mt-3 flex justify-between gap-4 border-t-2 border-black pt-3 print:border-zinc-800 dark:border-zinc-700/90">
                      <span className="font-bold text-zinc-900 print:text-[11px] print:text-black dark:text-zinc-200">
                        Total a pagar
                      </span>
                      <span className="text-lg font-bold tabular-nums text-zinc-900 print:text-base print:text-black dark:text-zinc-50">
                        {formatCop(totalCents)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="hidden print:mt-4 print:block print:text-black">
        <p className="border-t border-dashed border-zinc-600 pt-8 text-center text-[10px]">
          Firma cliente
        </p>
        <p className="mt-3 text-center text-[10px] font-semibold leading-snug">
          {lines.length} producto{lines.length === 1 ? "" : "s"} · IVA incluido
        </p>
        <p className="mt-1 text-center text-[11px] font-bold">
          ¡Gracias por su compra! · {invoiceTradeName}
        </p>
      </div>
    </div>
  );
}
