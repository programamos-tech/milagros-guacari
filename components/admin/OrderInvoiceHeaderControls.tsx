"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { updateAdminOrderStatus } from "@/app/actions/admin/order-status";
import { productInputClass as inputClass } from "@/components/admin/product-form-primitives";
import { ORDER_CANCELLATION_REASON_MIN_LENGTH } from "@/lib/orders-constants";

const INVOICE_OPTIONS: { value: string; label: string }[] = [
  { value: "paid", label: "Finalizada" },
  { value: "pending", label: "Pendiente" },
  { value: "cancelled", label: "Anulada" },
  { value: "failed", label: "Fallida" },
];

function selectClassForStatus(status: string): string {
  const base =
    "w-full min-w-[150px] rounded-lg border px-3 py-2 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-500 dark:focus-visible:ring-offset-zinc-900";
  switch (status) {
    case "paid":
      return `${base} border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800/70 dark:bg-emerald-950/45 dark:text-emerald-100`;
    case "pending":
      return `${base} border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/45 dark:text-amber-100`;
    case "cancelled":
      return `${base} border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100`;
    case "failed":
      return `${base} border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200`;
    default:
      return `${base} border-zinc-200 bg-white text-zinc-800 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100`;
  }
}

function IconPrinter({ className }: { className?: string }) {
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
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 9V3h12v6" />
      <path d="M18 14v8H6v-8Z" />
    </svg>
  );
}

export function OrderInvoicePrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:shadow-none dark:hover:border-zinc-600 dark:hover:bg-zinc-800 print:hidden"
    >
      <IconPrinter className="size-4 text-zinc-500 dark:text-zinc-400" />
      Imprimir
    </button>
  );
}

function CancelInvoiceModal({
  open,
  orderId,
  invoiceRef,
  onClose,
  onSucceeded,
}: {
  open: boolean;
  orderId: string;
  invoiceRef: string;
  onClose: () => void;
  onSucceeded: () => void;
}) {
  const [reason, setReason] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setLocalError(null);
      setPending(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const minLen = ORDER_CANCELLATION_REASON_MIN_LENGTH;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[1px] dark:bg-black/55"
        aria-label="Cerrar"
        onClick={pending ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-invoice-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-[0_24px_64px_-24px_rgba(0,0,0,0.6)]"
      >
        <h2
          id="cancel-invoice-title"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
        >
          Anular factura #{invoiceRef}
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Cuéntanos el motivo de la anulación. Este dato queda registrado para
          auditoría.
        </p>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Motivo
        </label>
        <textarea
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setLocalError(null);
          }}
          rows={4}
          placeholder="Ej.: cliente pidió devolución, error en el cobro, duplicado…"
          disabled={pending}
          className={`${inputClass} mt-2 min-h-[100px] resize-y`}
        />
        {localError ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{localError}</p>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Volver
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={async () => {
              const t = reason.trim();
              if (t.length < minLen) {
                setLocalError(
                  `Escribe al menos ${minLen} caracteres explicando el motivo.`,
                );
                return;
              }
              setPending(true);
              setLocalError(null);
              const res = await updateAdminOrderStatus(orderId, "cancelled", t);
              setPending(false);
              if (!res.ok) {
                if (res.error === "reason_required") {
                  setLocalError(
                    `El motivo debe tener al menos ${minLen} caracteres.`,
                  );
                } else if (res.error === "auth") {
                  setLocalError("Sesión expirada. Vuelve a iniciar sesión.");
                } else if (res.error === "forbidden") {
                  setLocalError("No tenés permiso para cambiar el estado de la factura.");
                } else {
                  setLocalError("No se pudo guardar. Intenta de nuevo.");
                }
                return;
              }
              onSucceeded();
            }}
            className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? "Guardando…" : "Confirmar anulación"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function OrderInvoiceStatusSelect({
  orderId,
  invoiceRef,
  currentStatus,
}: {
  orderId: string;
  invoiceRef: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(currentStatus);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  useEffect(() => {
    setValue(currentStatus);
  }, [currentStatus]);

  return (
    <>
      <select
        aria-label="Estado de la factura"
        disabled={pending}
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "cancelled" && currentStatus !== "cancelled") {
            setCancelModalOpen(true);
            return;
          }
          setValue(v);
          startTransition(async () => {
            const res = await updateAdminOrderStatus(orderId, v);
            if (!res.ok) {
              setValue(currentStatus);
              return;
            }
            router.refresh();
          });
        }}
        className={`${selectClassForStatus(value)} disabled:opacity-60`}
      >
        {INVOICE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <CancelInvoiceModal
        open={cancelModalOpen}
        orderId={orderId}
        invoiceRef={invoiceRef}
        onClose={() => setCancelModalOpen(false)}
        onSucceeded={() => {
          setValue("cancelled");
          setCancelModalOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
