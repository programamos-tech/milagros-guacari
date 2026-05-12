"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createStoreExpense } from "@/app/actions/admin/expenses";
import {
  AdminDateInput,
  ProductMoneyInput,
  productInputClass as inputClass,
  productLabelClass as labelClass,
  productSectionTitle as sectionTitle,
} from "@/components/admin/product-form-primitives";

const cardSectionClass =
  "rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm ring-1 ring-zinc-950/5 sm:p-6 dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-none dark:ring-white/[0.06]";

export type TurnWorkerOption = { id: string; label: string };

const ALL_CONCEPT_OPTIONS: Array<{
  concept: string;
  category: string;
  paymentMethod: "transferencia" | "efectivo" | "tarjeta" | "otro";
}> = [
  { concept: "Arriendo del local", category: "fijo", paymentMethod: "transferencia" },
  { concept: "Servicios (luz/agua/internet)", category: "servicios", paymentMethod: "transferencia" },
  { concept: "Pago de nómina", category: "nomina", paymentMethod: "transferencia" },
  { concept: "Personal Turnos", category: "nomina", paymentMethod: "efectivo" },
  { concept: "Transporte / domicilios", category: "logistica", paymentMethod: "efectivo" },
  { concept: "Compra de insumos", category: "insumos", paymentMethod: "transferencia" },
  { concept: "Publicidad / pauta", category: "marketing", paymentMethod: "tarjeta" },
  { concept: "Mantenimiento", category: "mantenimiento", paymentMethod: "transferencia" },
  { concept: "Impuestos / retenciones", category: "impuestos", paymentMethod: "transferencia" },
  { concept: "Comisiones bancarias", category: "financiero", paymentMethod: "transferencia" },
  { concept: "Papelería / oficina", category: "operativo", paymentMethod: "efectivo" },
  { concept: "Otro", category: "operativo", paymentMethod: "transferencia" },
];

export function NewExpenseHeader() {
  return (
    <div className="mb-6 flex min-w-0 flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <Link href="/admin/egresos" className="hover:text-zinc-800 dark:hover:text-zinc-200">
            Egresos
          </Link>
          <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">/</span>
          <span className="text-zinc-700 dark:text-zinc-300">Nuevo egreso</span>
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl md:text-3xl">
          Nuevo egreso
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
          Registra un gasto operativo con el mismo patrón visual de los demás módulos.
        </p>
      </div>
      <Link
        href="/admin/egresos"
        className="inline-flex size-10 shrink-0 items-center justify-center self-start rounded-lg border border-zinc-200/90 bg-white text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 sm:self-auto"
        aria-label="Volver a egresos"
      >
        <span className="text-lg leading-none" aria-hidden>
          ←
        </span>
      </Link>
    </div>
  );
}

function errorMessage(code: string | undefined) {
  switch (code) {
    case "concept":
      return "Ingresa un concepto para el egreso.";
    case "amount":
      return "Monto inválido en el egreso.";
    case "db":
      return "No se pudo guardar el egreso en base de datos.";
    default:
      return null;
  }
}

export function NewExpenseForm({
  initialError,
  turnWorkers = [],
}: {
  initialError?: string;
  turnWorkers?: TurnWorkerOption[];
}) {
  const conceptOptionsForSelect = useMemo(
    () =>
      turnWorkers.length > 0
        ? ALL_CONCEPT_OPTIONS
        : ALL_CONCEPT_OPTIONS.filter((o) => o.concept !== "Personal Turnos"),
    [turnWorkers.length],
  );

  const [conceptSelection, setConceptSelection] = useState(
    () => conceptOptionsForSelect[0]?.concept ?? "",
  );
  const [conceptOther, setConceptOther] = useState("");
  const [turnWorkerId, setTurnWorkerId] = useState("");
  const [category, setCategory] = useState(
    () => conceptOptionsForSelect[0]?.category ?? "operativo",
  );
  const [paymentMethod, setPaymentMethod] = useState<
    "transferencia" | "efectivo" | "tarjeta" | "otro"
  >(() => conceptOptionsForSelect[0]?.paymentMethod ?? "transferencia");
  const [notes, setNotes] = useState("");
  const [amountCents, setAmountCents] = useState(0);
  const [expenseDate, setExpenseDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  useEffect(() => {
    if (conceptOptionsForSelect.some((o) => o.concept === conceptSelection)) return;
    const first = conceptOptionsForSelect[0];
    if (first) {
      setConceptSelection(first.concept);
      setCategory(first.category);
      setPaymentMethod(first.paymentMethod);
      setTurnWorkerId("");
    }
  }, [conceptOptionsForSelect, conceptSelection]);

  const err = useMemo(() => errorMessage(initialError), [initialError]);
  const conceptValue = useMemo(() => {
    if (conceptSelection === "Otro") return conceptOther.trim();
    if (conceptSelection === "Personal Turnos") {
      const w = turnWorkers.find((t) => t.id === turnWorkerId);
      return w ? `Personal Turnos — ${w.label}` : "";
    }
    return conceptSelection;
  }, [conceptSelection, conceptOther, turnWorkerId, turnWorkers]);

  const otroIncomplete = conceptSelection === "Otro" && !conceptOther.trim();
  const turnoIncomplete =
    conceptSelection === "Personal Turnos" &&
    (!turnWorkerId || !turnWorkers.some((t) => t.id === turnWorkerId));
  const submitBlocked = otroIncomplete || turnoIncomplete;

  return (
    <form action={createStoreExpense} className="space-y-6">
      {err ? (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100">
          {err}
        </p>
      ) : null}

      <section className={cardSectionClass}>
        <h2 className={sectionTitle}>Información del egreso</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Concepto</label>
            <select
              value={conceptSelection}
              onChange={(e) => {
                const next = e.target.value;
                setConceptSelection(next);
                setTurnWorkerId("");
                const hit = conceptOptionsForSelect.find((c) => c.concept === next);
                if (hit) {
                  setCategory(hit.category);
                  setPaymentMethod(hit.paymentMethod);
                }
              }}
              className={inputClass}
            >
              {conceptOptionsForSelect.map((opt) => (
                <option key={opt.concept} value={opt.concept}>
                  {opt.concept}
                </option>
              ))}
            </select>
            {conceptSelection === "Personal Turnos" ? (
              <div className="mt-3">
                <label className={`${labelClass} text-zinc-600 dark:text-zinc-400`}>
                  Trabajador
                </label>
                <select
                  value={turnWorkerId}
                  onChange={(e) => setTurnWorkerId(e.target.value)}
                  required
                  className={`${inputClass} mt-1.5`}
                  aria-label="Seleccionar a quién se le pagó el turno"
                >
                  <option value="">Elegí a quién se le pagó el turno…</option>
                  {turnWorkers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {conceptSelection === "Otro" ? (
              <input
                value={conceptOther}
                onChange={(e) => setConceptOther(e.target.value)}
                placeholder="Escribe el concepto"
                className={`${inputClass} mt-3`}
              />
            ) : null}
            <input type="hidden" name="concept" value={conceptValue} required />
          </div>
          <div>
            <label className={labelClass}>Monto (COP)</label>
            <ProductMoneyInput
              name="amount_cents"
              required
              value={amountCents}
              onChange={setAmountCents}
            />
          </div>
          <div>
            <label className={labelClass}>Fecha</label>
            <AdminDateInput
              name="expense_date"
              required
              value={expenseDate}
              onChange={setExpenseDate}
            />
          </div>
          <div>
            <label className={labelClass}>Categoría</label>
            <input
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="operativo"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Método de pago</label>
            <select
              name="payment_method"
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(
                  e.target.value as "transferencia" | "efectivo" | "tarjeta" | "otro",
                )
              }
              className={inputClass}
            >
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Nota (opcional)</label>
            <input
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalle adicional del egreso"
              className={inputClass}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={submitBlocked}
          className="mt-5 rounded-lg border border-rose-950 bg-rose-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-900 hover:border-rose-900 disabled:pointer-events-none disabled:opacity-45 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white dark:disabled:opacity-40"
        >
          Registrar egreso
        </button>
      </section>
    </form>
  );
}

