import { formatCop } from "@/lib/money";
import type { StockInvestmentTrend } from "@/lib/admin-stock-investment-trend";

export function ReportStockTrendLine({
  trend,
}: {
  trend: StockInvestmentTrend | null;
}) {
  if (!trend) return null;

  const { netDelta7d, changeNetPercent, movementCount } = trend;
  const up = netDelta7d > 0;
  const down = netDelta7d < 0;
  const flat = netDelta7d === 0;

  if (flat && movementCount === 0) {
    return (
      <p className="mt-1.5 text-[11px] leading-snug text-stone-400 dark:text-zinc-500">
        Sin movimientos de stock en 7 días
      </p>
    );
  }

  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-snug">
      <span
        className={`size-1.5 shrink-0 rounded-full ${
          up
            ? "bg-emerald-500/85"
            : down
              ? "bg-red-500/85"
              : "bg-stone-300 dark:bg-zinc-600"
        }`}
        aria-hidden
      />
      {flat ? (
        <span className="text-stone-500 dark:text-zinc-400">Sin cambio en 7 días</span>
      ) : (
        <>
          <span
            className={`font-medium tabular-nums ${
              up
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-red-700 dark:text-red-400"
            }`}
          >
            {up ? "+" : ""}
            {formatCop(netDelta7d)}
          </span>
          <span className="text-stone-400 dark:text-zinc-500">vs hace 7 días</span>
          {changeNetPercent != null ? (
            <span
              className={`font-medium tabular-nums ${
                up
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-red-700 dark:text-red-400"
              }`}
            >
              ({changeNetPercent > 0 ? "+" : ""}
              {changeNetPercent}%)
            </span>
          ) : null}
        </>
      )}
    </p>
  );
}
