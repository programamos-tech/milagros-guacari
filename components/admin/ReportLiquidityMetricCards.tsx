"use client";

import { useEffect, useId, useState } from "react";
import { Info, X } from "lucide-react";
import { AnimatedCopCents } from "@/components/admin/ReportsAnimatedFigures";
import { formatCop } from "@/lib/money";
import { prettyReportDayShortLabel } from "@/lib/admin-report-range";

export type ReportExpenseDetailLine = {
  id: string;
  concept: string;
  amount_cents: number;
  expense_date: string;
  payment_method: string;
  category: string | null;
  created_at: string | null;
};

type Props = {
  cardLabelClass: string;
  periodLabel: string;
  totalCobradoPedidos: number;
  efectivo: number;
  efectivoNetoCaja: number;
  egresosEfectivoCents: number;
  expensesEfectivo: ReportExpenseDetailLine[];
  transferencia: number;
  transferenciaNeta: number;
  egresosTransferenciaBucketCents: number;
  expensesOtros: ReportExpenseDetailLine[];
};

function pmLabel(pm: string): string {
  const p = pm.trim().toLowerCase();
  if (p === "efectivo") return "Efectivo";
  if (p === "transferencia") return "Transferencia";
  if (p === "tarjeta") return "Tarjeta";
  if (p === "otro") return "Otro";
  return pm || "—";
}

function ExpenseRows({ rows }: { rows: ReportExpenseDetailLine[] }) {
  if (rows.length === 0) {
    return (
      <li className="rounded-lg border border-dashed border-stone-200 px-3 py-2 text-xs text-stone-500 dark:border-zinc-700 dark:text-zinc-400">
        Ninguno en este periodo.
      </li>
    );
  }
  return (
    <>
      {rows.map((row) => (
        <li
          key={row.id}
          className="rounded-lg border border-stone-100 bg-stone-50/90 px-3 py-2 dark:border-zinc-700/80 dark:bg-zinc-800/60"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 flex-1 font-medium leading-snug text-stone-900 dark:text-zinc-100">
              {row.concept || "Sin concepto"}
            </p>
            <p className="shrink-0 text-sm font-semibold tabular-nums text-stone-900 dark:text-zinc-100">
              {formatCop(row.amount_cents)}
            </p>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-stone-500 dark:text-zinc-400">
            {prettyReportDayShortLabel(row.expense_date)}
            {row.category ? ` · ${row.category}` : ""}
            {` · ${pmLabel(row.payment_method)}`}
          </p>
        </li>
      ))}
    </>
  );
}

export function ReportLiquidityMetricCards({
  cardLabelClass,
  periodLabel,
  totalCobradoPedidos,
  efectivo,
  efectivoNetoCaja,
  egresosEfectivoCents,
  expensesEfectivo,
  transferencia,
  transferenciaNeta,
  egresosTransferenciaBucketCents,
  expensesOtros,
}: Props) {
  const [open, setOpen] = useState<null | "efectivo" | "transferencia">(null);
  const titleId = useId();

  useEffect(() => {
    if (open === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const efectivoHint =
    totalCobradoPedidos > 0
      ? `${Math.round((efectivo / totalCobradoPedidos) * 100)}% cobrado en efectivo`
      : egresosEfectivoCents > 0
        ? "Solo egresos en efectivo en el periodo (sin ventas POS)"
        : "Sin cobros POS en efectivo en el periodo";

  const transferHint =
    totalCobradoPedidos > 0
      ? `${Math.round((transferencia / totalCobradoPedidos) * 100)}% del cobrado en este bucket`
      : egresosTransferenciaBucketCents > 0
        ? "Solo egresos en el periodo (sin cobros en transferencia / web)"
        : "Sin cobros en este bucket en el periodo";

  const infoBtnClass =
    "inline-flex shrink-0 rounded-sm text-rose-900/50 transition hover:text-rose-900/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50 dark:text-zinc-500 dark:hover:text-zinc-300 dark:focus-visible:ring-zinc-500/40";

  const modalTitle =
    open === "efectivo"
      ? "Egresos en efectivo"
      : open === "transferencia"
        ? "Egresos en transferencia, tarjeta y otros"
        : "";

  const modalHelp =
    open === "efectivo"
      ? "Solo egresos registrados como efectivo. Ya están descontados del neto de la tarjeta Efectivo."
      : open === "transferencia"
        ? "Solo egresos que no son efectivo (transferencia, tarjeta u otro). Ya están descontados del neto de la tarjeta Transferencia."
        : "";

  const modalTotalCents =
    open === "efectivo"
      ? egresosEfectivoCents
      : open === "transferencia"
        ? egresosTransferenciaBucketCents
        : 0;

  const modalRows =
    open === "efectivo"
      ? expensesEfectivo
      : open === "transferencia"
        ? expensesOtros
        : [];

  return (
    <>
      {open !== null ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 dark:bg-black/60"
            aria-label="Cerrar"
            onClick={() => setOpen(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative flex max-h-[min(88dvh,32rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
          >
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-stone-100 px-4 py-3 dark:border-zinc-800">
              <div className="min-w-0">
                <h2
                  id={titleId}
                  className="text-sm font-semibold text-stone-900 dark:text-zinc-100"
                >
                  {modalTitle}
                </h2>
                <p className="mt-0.5 text-xs text-stone-500 dark:text-zinc-400">{periodLabel}</p>
                <p className="mt-2 text-[11px] leading-snug text-stone-500 dark:text-zinc-400">
                  {modalHelp}
                </p>
                {modalTotalCents > 0 ? (
                  <p className="mt-2 text-xs font-semibold tabular-nums text-stone-800 dark:text-zinc-200">
                    Total: {formatCop(modalTotalCents)}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="shrink-0 rounded-md p-1.5 text-stone-500 transition hover:bg-stone-100 dark:hover:bg-zinc-800"
                aria-label="Cerrar"
              >
                <X className="size-4" strokeWidth={2} aria-hidden />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              <ul className="space-y-2">
                <ExpenseRows rows={modalRows} />
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      <div
        className="reports-metric-card min-w-0"
        style={{ ["--reports-stagger" as string]: "70ms" }}
      >
        <dt className={`${cardLabelClass} flex min-w-0 items-center gap-1`}>
          <span className="min-w-0 truncate">Efectivo</span>
          <button
            type="button"
            className={infoBtnClass}
            onClick={() => setOpen("efectivo")}
            aria-label="Ver egresos en efectivo del periodo"
            title="Egresos en efectivo"
          >
            <Info className="size-3.5" strokeWidth={2} aria-hidden />
          </button>
        </dt>
        <dd className="mt-1 text-2xl font-normal tabular-nums text-stone-900 dark:text-zinc-100">
          <AnimatedCopCents
            cents={efectivoNetoCaja}
            delay={120}
            className={efectivoNetoCaja < 0 ? "text-red-700 dark:text-red-300" : undefined}
          />
        </dd>
        <p className="mt-1 text-xs text-stone-500 dark:text-zinc-400">{efectivoHint}</p>
      </div>

      <div
        className="reports-metric-card min-w-0"
        style={{ ["--reports-stagger" as string]: "135ms" }}
      >
        <dt className={`${cardLabelClass} flex min-w-0 items-center gap-1`}>
          <span className="min-w-0 truncate">Transferencia</span>
          <button
            type="button"
            className={infoBtnClass}
            onClick={() => setOpen("transferencia")}
            aria-label="Ver egresos en transferencia, tarjeta y otros del periodo"
            title="Egresos transferencia / tarjeta / otros"
          >
            <Info className="size-3.5" strokeWidth={2} aria-hidden />
          </button>
        </dt>
        <dd className="mt-1 text-2xl font-normal tabular-nums text-stone-900 dark:text-zinc-100">
          <AnimatedCopCents
            cents={transferenciaNeta}
            delay={185}
            className={transferenciaNeta < 0 ? "text-red-700 dark:text-red-300" : undefined}
          />
        </dd>
        <p className="mt-1 text-xs text-stone-500 dark:text-zinc-400">{transferHint}</p>
      </div>
    </>
  );
}
