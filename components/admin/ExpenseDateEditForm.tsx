"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateStoreExpenseDate } from "@/app/actions/admin/expenses";
import {
  AdminDateInput,
  productLabelClass as labelClass,
} from "@/components/admin/product-form-primitives";

type Props = {
  expenseId: string;
  initialDate: string;
  canEdit: boolean;
};

export function ExpenseDateEditForm({ expenseId, initialDate, canEdit }: Props) {
  const router = useRouter();
  const [date, setDate] = useState(initialDate);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!canEdit) {
    return <p className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{initialDate}</p>;
  }

  const dirty = date !== initialDate;

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!dirty) return;
        setPending(true);
        setError(null);
        setSaved(false);
        const res = await updateStoreExpenseDate(expenseId, date);
        setPending(false);
        if (!res.ok) {
          if (res.error === "cancelled") {
            setError("No se puede cambiar la fecha de un egreso anulado.");
          } else if (res.error === "forbidden") {
            setError("No tenés permiso para editar egresos.");
          } else {
            setError("No se pudo guardar la fecha. Intenta de nuevo.");
          }
          return;
        }
        setSaved(true);
        router.refresh();
      }}
    >
      <label className={labelClass}>Fecha del egreso</label>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Elegí el día del gasto con el calendario.
      </p>
      <AdminDateInput
        name="expense_date"
        required
        value={date}
        onChange={(v) => {
          setDate(v);
          setSaved(false);
          setError(null);
        }}
      />
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      {saved && !dirty ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">Fecha actualizada.</p>
      ) : null}
      {dirty ? (
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          {pending ? "Guardando…" : "Guardar fecha"}
        </button>
      ) : null}
    </form>
  );
}
