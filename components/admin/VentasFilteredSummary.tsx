import { formatCop, formatCopCompact } from "@/lib/money";

export type VentasFilterStats = {
  totalCents: number;
  cashCents: number;
  transferCents: number;
  mixedCents: number;
  otherCents: number;
  paidCount: number;
};

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

  const countLabel =
    paidCount === 0
      ? "Sin ventas finalizadas"
      : `${paidCount} ${paidCount === 1 ? "finalizada" : "finalizadas"}`;

  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:gap-y-1">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
          Total filtrado
        </span>
        <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50 sm:text-base">
          {formatCop(totalCents)}
        </span>
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">· {countLabel}</span>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:justify-end">
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-950 ring-1 ring-amber-200/70 dark:bg-amber-950/35 dark:text-amber-100 dark:ring-amber-800/45">
          <span className="text-amber-900/85 dark:text-amber-200/90">Efectivo</span>
          <span className="tabular-nums font-semibold">{pCash}%</span>
          <span className="text-amber-900/65 dark:text-amber-200/75">
            ({formatCopCompact(cashCents)})
          </span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-950 ring-1 ring-sky-200/70 dark:bg-sky-950/35 dark:text-sky-100 dark:ring-sky-800/45">
          <span className="text-sky-900/85 dark:text-sky-200/90">Transferencia</span>
          <span className="tabular-nums font-semibold">{pTransfer}%</span>
          <span className="text-sky-900/65 dark:text-sky-200/75">
            ({formatCopCompact(transferCents)})
          </span>
        </span>
        {(mixedCents > 0 || otherCents > 0) && (
          <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-950 ring-1 ring-violet-200/70 dark:bg-violet-950/30 dark:text-violet-100 dark:ring-violet-800/45">
            <span className="text-violet-900/85 dark:text-violet-200/90">Mixto / en línea</span>
            <span className="tabular-nums font-semibold">{pMixedOther}%</span>
            <span className="text-violet-900/65 dark:text-violet-200/75">
              ({formatCopCompact(mixedCents + otherCents)})
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

export function computeVentasFilterStats(rows: {
  status: string;
  total_cents: number;
  wompi_reference: string | null;
}[]): VentasFilterStats {
  let totalCents = 0;
  let cashCents = 0;
  let transferCents = 0;
  let mixedCents = 0;
  let otherCents = 0;
  let paidCount = 0;

  for (const r of rows) {
    if (r.status !== "paid") continue;
    paidCount += 1;
    const c = Math.max(0, Math.round(Number(r.total_cents ?? 0)));
    totalCents += c;
    const ref = (r.wompi_reference ?? "").trim();
    if (ref === "POS:cash") cashCents += c;
    else if (ref === "POS:transfer") transferCents += c;
    else if (ref === "POS:mixed") mixedCents += c;
    else otherCents += c;
  }

  return {
    totalCents,
    cashCents,
    transferCents,
    mixedCents,
    otherCents,
    paidCount,
  };
}
