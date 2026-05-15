"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cancelStoreExpense } from "@/app/actions/admin/expenses";
import { productInputClass as inputClass } from "@/components/admin/product-form-primitives";
import { EXPENSE_CANCELLATION_REASON_MIN_LENGTH } from "@/lib/expenses-constants";
import { adminButtonCancelClass } from "@/lib/admin-ui";

const iconBtnClass =
  "inline-flex size-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-red-50 hover:text-red-700 disabled:pointer-events-none disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-red-950/40 dark:hover:text-red-300";

function CancelExpenseModal({
  open,
  expenseId,
  conceptLabel,
  onClose,
  onSucceeded,
}: {
  open: boolean;
  expenseId: string;
  conceptLabel: string;
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

  const minLen = EXPENSE_CANCELLATION_REASON_MIN_LENGTH;

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
        aria-labelledby="cancel-expense-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <h2
          id="cancel-expense-title"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
        >
          Anular egreso
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          <span className="font-medium text-zinc-800 dark:text-zinc-200">{conceptLabel}</span>
          {" — "}
          el monto dejará de contarse en reportes. El registro se conserva con motivo de auditoría.
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
          placeholder="Ej.: duplicado, error de monto, gasto no realizado…"
          disabled={pending}
          className={`${inputClass} mt-2 min-h-[100px] resize-y`}
        />
        {localError ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{localError}</p>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" disabled={pending} onClick={onClose} className={adminButtonCancelClass}>
            Volver
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={async () => {
              const t = reason.trim();
              if (t.length < minLen) {
                setLocalError(`Escribe al menos ${minLen} caracteres explicando el motivo.`);
                return;
              }
              setPending(true);
              setLocalError(null);
              const res = await cancelStoreExpense(expenseId, t);
              setPending(false);
              if (!res.ok) {
                if (res.error === "reason_required") {
                  setLocalError(`El motivo debe tener al menos ${minLen} caracteres.`);
                } else if (res.error === "already_cancelled") {
                  setLocalError("Este egreso ya está anulado.");
                } else if (res.error === "auth") {
                  setLocalError("Sesión expirada. Vuelve a iniciar sesión.");
                } else if (res.error === "forbidden") {
                  setLocalError("No tenés permiso para anular egresos.");
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

type Props = {
  expenseId: string;
  conceptLabel: string;
  isCancelled: boolean;
  canCancel: boolean;
  variant?: "icon" | "button";
};

export function ExpenseCancelButton({
  expenseId,
  conceptLabel,
  isCancelled,
  canCancel,
  variant = "icon",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (isCancelled || !canCancel) return null;

  const trigger =
    variant === "button" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-lg border border-red-200/80 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100 dark:hover:bg-red-950/70"
      >
        Anular egreso
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={iconBtnClass}
        title="Anular egreso"
        aria-label="Anular egreso"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="10" />
          <path d="m15 9-6 6M9 9l6 6" />
        </svg>
      </button>
    );

  return (
    <>
      {trigger}
      <CancelExpenseModal
        open={open}
        expenseId={expenseId}
        conceptLabel={conceptLabel}
        onClose={() => setOpen(false)}
        onSucceeded={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
