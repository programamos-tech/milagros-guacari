import type { SupplierInvoiceUiStatus } from "@/lib/supplier-invoices";
import { supplierInvoiceUiStatus } from "@/lib/supplier-invoices";

export type InvoiceRow = {
  id: string;
  supplier_id: string;
  total_cents: number;
  is_cancelled: boolean;
};

export type PaymentRow = {
  invoice_id: string;
  amount_cents: number;
};

export type SupplierHubRow = {
  id: string;
  name: string;
  email: string | null;
  invoiceCount: number;
  totalCents: number;
  paidCents: number;
  pendingCents: number;
  /** Estado agregado para la fila del proveedor. */
  rollUpStatus: SupplierInvoiceUiStatus | "empty";
};

function paidForInvoice(invId: string, payments: PaymentRow[]): number {
  return payments
    .filter((p) => p.invoice_id === invId)
    .reduce((s, p) => s + Number(p.amount_cents ?? 0), 0);
}

export function buildSupplierHubRows(
  supplierIds: { id: string; name: string; email?: string | null }[],
  invoices: InvoiceRow[],
  payments: PaymentRow[],
): SupplierHubRow[] {
  const invBySupplier = new Map<string, InvoiceRow[]>();
  for (const inv of invoices) {
    const list = invBySupplier.get(inv.supplier_id) ?? [];
    list.push(inv);
    invBySupplier.set(inv.supplier_id, list);
  }

  return supplierIds.map((s) => {
    const list = invBySupplier.get(s.id) ?? [];
    let totalCents = 0;
    let paidCents = 0;
    let pendingCents = 0;
    let allCancelled = list.length > 0;
    let anyActive = false;

    for (const inv of list) {
      const paid = paidForInvoice(inv.id, payments);
      if (inv.is_cancelled) {
        continue;
      }
      anyActive = true;
      allCancelled = false;
      const total = Number(inv.total_cents ?? 0);
      const pend = Math.max(0, total - paid);
      totalCents += total;
      paidCents += paid;
      pendingCents += pend;
    }

    let rollUpStatus: SupplierHubRow["rollUpStatus"] = "empty";
    if (!anyActive && list.length > 0 && list.every((i) => i.is_cancelled)) {
      rollUpStatus = "cancelled";
    } else if (anyActive) {
      const hasPending = list.some((inv) => {
        if (inv.is_cancelled) return false;
        const paid = paidForInvoice(inv.id, payments);
        return supplierInvoiceUiStatus(
          Number(inv.total_cents ?? 0),
          paid,
          false,
        ) === "pending";
      });
      rollUpStatus = hasPending ? "pending" : "paid";
    }

    return {
      id: s.id,
      name: s.name,
      email: s.email != null && String(s.email).trim() ? String(s.email).trim() : null,
      invoiceCount: list.length,
      totalCents,
      paidCents,
      pendingCents,
      rollUpStatus,
    };
  });
}
