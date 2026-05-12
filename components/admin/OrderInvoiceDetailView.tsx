import Link from "next/link";
import {
  OrderInvoicePrintButton,
  OrderInvoiceStatusSelect,
} from "@/components/admin/OrderInvoiceHeaderControls";
import { adminOwnerDisplayName } from "@/lib/admin-owner";
import {
  storeBrand,
  storeLegalName,
  storeSupportEmail,
  storeSupportPhone,
  storeTaxNit,
  storeTaxRegime,
} from "@/lib/brand";
import { formatCop } from "@/lib/money";
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
};

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
  const d = new Date(iso);
  return d.toLocaleString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatInvoiceDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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
  } = props;

  const pagoBadge = ventaFormaPagoBadge(wompiReference);
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
    <div className="invoice-ticket-print mx-auto max-w-7xl space-y-6 print:mx-auto print:max-w-[72mm] print:space-y-3 print:bg-white print:text-zinc-900 print:text-[11px] print:leading-snug dark:print:bg-white">
      <nav className="text-sm text-zinc-500 print:hidden dark:text-zinc-400">
        <Link
          href="/admin/ventas"
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
        <div className="hidden border-b border-zinc-900 pb-2 text-black print:block">
          <p className="text-center text-xs font-bold leading-tight">{storeLegalName}</p>
          {storeTaxNit ? (
            <p className="mt-1 text-center text-[10px]">NIT: {storeTaxNit}</p>
          ) : null}
          {storeTaxRegime ? (
            <p className="mt-0.5 text-center text-[9px] leading-tight">{storeTaxRegime}</p>
          ) : null}
          <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-wide">
            Factura de venta
          </p>
          <div className="mt-1 flex justify-between gap-2 text-[10px] font-semibold">
            <span>No. #{invoiceRef}</span>
            <span className="shrink-0 tabular-nums">{formatInvoiceDateShort(createdAt)}</span>
          </div>
          <p className="mt-2 text-center text-[9px]">Tel. {storeSupportPhone}</p>
          {storeSupportEmail ? (
            <p className="text-center text-[9px] break-all">{storeSupportEmail}</p>
          ) : null}
          <div className="mt-3 space-y-1 border-t border-dashed border-zinc-500 pt-2 text-left text-[9px]">
            <p>
              <span className="font-semibold">Cliente:</span> {customerName}
            </p>
            {customerEmail && !customerEmail.includes("@local.invalid") ? (
              <p className="break-all">
                <span className="font-semibold">Correo:</span> {customerEmail}
              </p>
            ) : null}
            <p>
              <span className="font-semibold">Entrega:</span> {ubicacionLine}
            </p>
            <p>
              <span className="font-semibold">Tienda:</span> {storeBrand}
            </p>
            <p>
              <span className="font-semibold">Vendedor:</span> {adminOwnerDisplayName}
            </p>
            {shippingPhone ? (
              <p>
                <span className="font-semibold">Tel. pedido:</span> {shippingPhone}
              </p>
            ) : null}
            <p>
              <span className="font-semibold">Estado factura:</span> {docEstado.label}
            </p>
            <p>
              <span className="font-semibold">Pago:</span> {pagoRecibido.label} ·{" "}
              {pagoBadge.label}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 print:hidden">
          <h1 className="min-w-0 flex-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl md:text-3xl">
            Factura #{invoiceRef}
          </h1>
          <Link
            href="/admin/ventas"
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
          <div className="hidden min-w-0 print:block">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
              Total
            </p>
            <p className="mt-1 text-base font-bold tabular-nums text-zinc-900">
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

      <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-[0_1px_0_0_rgb(24_24_27/0.04)] dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-none md:p-7 print:rounded-none print:border-zinc-900 print:p-3 print:shadow-none dark:print:border-zinc-900 dark:print:bg-white">
        <p className={`${labelClass} print:text-center`}>Productos de la factura</p>

        {lines.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">No hay ítems en este pedido.</p>
        ) : (
          <>
            <div className="mt-5 hidden space-y-0 border-y border-zinc-900 print:block">
              {lines.map((line) => {
                const sub = line.unitPriceCents * line.quantity;
                const ref = line.reference?.trim();
                return (
                  <div
                    key={`print-${line.id}`}
                    className="border-b border-dashed border-zinc-400 py-2 text-[10px] last:border-b-0"
                  >
                    <div className="flex justify-between gap-2 font-medium leading-snug">
                      <span className="min-w-0 flex-1 break-words">
                        {line.quantity} × {line.name}
                        {ref ? (
                          <span className="mt-0.5 block font-mono text-[9px] font-normal text-zinc-600">
                            ({ref})
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 tabular-nums">{formatCop(sub)}</span>
                    </div>
                    <div className="mt-0.5 flex justify-between text-[9px] text-zinc-600">
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

            <div className="mt-6 flex justify-end print:break-inside-avoid print:mt-3">
              <div className="w-full max-w-xs rounded-xl border border-zinc-200 bg-zinc-50/80 px-5 py-4 dark:border-zinc-700 dark:bg-zinc-950/80 print:max-w-none print:rounded-md print:border-zinc-400 print:bg-transparent print:px-0 print:py-2">
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">Subtotal productos</span>
                  <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                    {formatCop(subtotalLines)}
                  </span>
                </div>
                <div className="mt-3 flex justify-between gap-4 border-t border-zinc-200/80 pt-3 dark:border-zinc-700/90">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">Total a despachar</span>
                  <span className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                    {formatCop(totalCents)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <p className="hidden border-t border-zinc-900 pt-3 text-center text-[10px] leading-relaxed text-zinc-800 print:block">
        Productos: {lines.length} ítem{lines.length === 1 ? "" : "s"} · IVA incluido
        <br />
        <span className="mt-1 block font-semibold">
          ¡Gracias por su compra! · {storeBrand}
        </span>
      </p>
    </div>
  );
}
