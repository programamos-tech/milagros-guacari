import {
  supplierInvoiceStatusBadge,
  supplierInvoiceUiStatus,
} from "@/lib/supplier-invoices";

export function SupplierInvoiceStatusPill({
  totalCents,
  paidCents,
  isCancelled,
}: {
  totalCents: number;
  paidCents: number;
  isCancelled: boolean;
}) {
  const st = supplierInvoiceUiStatus(totalCents, paidCents, isCancelled);
  const { label, className } = supplierInvoiceStatusBadge(st);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${className}`}
    >
      {st === "paid" ? (
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : st === "cancelled" ? (
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" strokeLinecap="round" />
        </svg>
      )}
      {label}
    </span>
  );
}
