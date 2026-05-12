"use client";

import { useState } from "react";
import { registerSupplierInvoicePaymentAction } from "@/app/actions/admin/suppliers";
import { useAdminTheme } from "@/components/admin/AdminThemeProvider";
import { productInputOnWhiteClass } from "@/components/admin/product-form-primitives";

export function SupplierAbonoForm({
  invoiceId,
  supplierId,
  pendingCents,
}: {
  invoiceId: string;
  supplierId: string;
  pendingCents: number;
}) {
  const [open, setOpen] = useState(false);
  const adminTheme = useAdminTheme();
  const isDark = adminTheme?.resolved === "dark";

  if (pendingCents <= 0) return null;

  const panelClass = isDark
    ? "border-zinc-700 bg-zinc-900 text-zinc-100 shadow-xl shadow-black/40"
    : "border-zinc-200 bg-white shadow-xl";
  const mutedClass = isDark ? "text-zinc-400" : "text-zinc-500";
  const labelClass = `mb-1 block text-[10px] font-semibold uppercase tracking-wide ${isDark ? "text-zinc-400" : "text-zinc-500"}`;
  const primaryBtn = isDark
    ? "flex-1 rounded-lg bg-zinc-100 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-white"
    : "flex-1 rounded-lg border border-rose-950 bg-rose-950 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-900 hover:border-rose-900";
  const ghostBtn = isDark
    ? "rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-200 hover:bg-zinc-700"
    : "rounded-lg border border-rose-200/70 px-3 py-2.5 text-sm text-rose-950/85 transition hover:border-rose-300/80 hover:bg-rose-50/60";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center rounded-lg border border-rose-950 bg-rose-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-900 hover:border-rose-900 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
      >
        + Registrar abono
      </button>
      {open ? (
        <div
          className={`absolute right-0 z-30 mt-2 w-[min(100vw-2rem,22rem)] rounded-xl border p-4 ${panelClass}`}
        >
          <p className={`text-xs ${mutedClass}`}>
            Saldo pendiente según factura. Ingresá el monto en pesos COP (entero, sin puntos ni comas).
          </p>
          <form action={registerSupplierInvoicePaymentAction} className="mt-4 space-y-3">
            <input type="hidden" name="invoice_id" value={invoiceId} />
            <input type="hidden" name="supplier_id" value={supplierId} />
            <div>
              <label className={labelClass}>Monto (COP)</label>
              <input
                name="amount_cents"
                type="number"
                min={1}
                max={pendingCents}
                required
                placeholder="Ej. 500000"
                className={productInputOnWhiteClass}
              />
            </div>
            <div>
              <label className={labelClass}>Método</label>
              <select name="payment_method" className={productInputOnWhiteClass} defaultValue="transferencia">
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
                <option value="cheque">Cheque</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Notas (opcional)</label>
              <input name="notes" type="text" className={productInputOnWhiteClass} placeholder="Referencia banco…" />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" className={primaryBtn}>
                Guardar abono
              </button>
              <button type="button" onClick={() => setOpen(false)} className={ghostBtn}>
                Cerrar
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
