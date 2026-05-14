"use client";

import type { VentasFilterStats } from "@/lib/ventas-filter-stats";
import {
  AnimatedCopCents,
  AnimatedCopCompactCents,
  AnimatedInteger,
  AnimatedPercentOneDecimal,
} from "@/components/admin/ReportsAnimatedFigures";

function pctOf(part: number, total: number) {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export function VentasFilteredSummary({ stats }: { stats: VentasFilterStats }) {
  const {
    totalCents,
    cashCents,
    transferCents,
    mixedCents,
    otherCents,
    paidCount,
  } = stats;

  const pCash = pctOf(cashCents, totalCents);
  const pTransfer = pctOf(transferCents, totalCents);
  const pMixedOther = pctOf(mixedCents + otherCents, totalCents);

  return (
    <div
      className="reports-metric-card flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:gap-y-1"
      style={{ ["--reports-stagger" as string]: "0ms" }}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
          Total filtrado
        </span>
        <AnimatedCopCents
          cents={totalCents}
          duration={1100}
          delay={40}
          className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50 sm:text-base"
        />
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
          ·{" "}
          {paidCount === 0 ? (
            "Sin ventas finalizadas"
          ) : (
            <>
              <AnimatedInteger
                value={paidCount}
                duration={850}
                delay={120}
                className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-200"
              />{" "}
              {paidCount === 1 ? "finalizada" : "finalizadas"}
            </>
          )}
        </span>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:justify-end">
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-950 ring-1 ring-amber-200/70 dark:bg-amber-950/35 dark:text-amber-100 dark:ring-amber-800/45">
          <span className="text-amber-900/85 dark:text-amber-200/90">Efectivo</span>
          <AnimatedPercentOneDecimal
            value={pCash}
            duration={900}
            delay={180}
            className="tabular-nums font-semibold"
          />
          <span className="text-amber-900/65 dark:text-amber-200/75">
            (
            <AnimatedCopCompactCents cents={cashCents} duration={1000} delay={200} />)
          </span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-950 ring-1 ring-sky-200/70 dark:bg-sky-950/35 dark:text-sky-100 dark:ring-sky-800/45">
          <span className="text-sky-900/85 dark:text-sky-200/90">Transferencia</span>
          <AnimatedPercentOneDecimal
            value={pTransfer}
            duration={900}
            delay={260}
            className="tabular-nums font-semibold"
          />
          <span className="text-sky-900/65 dark:text-sky-200/75">
            (
            <AnimatedCopCompactCents cents={transferCents} duration={1000} delay={280} />)
          </span>
        </span>
        {(mixedCents > 0 || otherCents > 0) && (
          <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-950 ring-1 ring-violet-200/70 dark:bg-violet-950/30 dark:text-violet-100 dark:ring-violet-800/45">
            <span className="text-violet-900/85 dark:text-violet-200/90">Mixto / en línea</span>
            <AnimatedPercentOneDecimal
              value={pMixedOther}
              duration={900}
              delay={340}
              className="tabular-nums font-semibold"
            />
            <span className="text-violet-900/65 dark:text-violet-200/75">
              (
              <AnimatedCopCompactCents cents={mixedCents + otherCents} duration={1000} delay={360} />)
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
