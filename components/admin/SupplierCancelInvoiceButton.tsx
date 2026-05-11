"use client";

import { cancelSupplierInvoiceAction } from "@/app/actions/admin/suppliers";

export function SupplierCancelInvoiceButton({
  supplierId,
  invoiceId,
  disabled,
}: {
  supplierId: string;
  invoiceId: string;
  disabled?: boolean;
}) {
  return (
    <form
      action={cancelSupplierInvoiceAction}
      onSubmit={(e) => {
        if (!confirm("¿Anular esta factura? No se podrán registrar nuevos abonos.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="supplier_id" value={supplierId} />
      <input type="hidden" name="invoice_id" value={invoiceId} />
      <button
        type="submit"
        disabled={disabled}
        className="rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800/70 dark:bg-red-950/30 dark:text-red-300 dark:shadow-none dark:hover:bg-red-950/50"
      >
        Anular factura
      </button>
    </form>
  );
}
