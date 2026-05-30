import Link from "next/link";
import type { ActivityStockTrace } from "@/lib/activity-log-stock";
import {
  formatStockBeforeAfter,
  formatStockLocationDelta,
  stockTraceSummaryLabel,
} from "@/lib/activity-log-stock";

export function ActivityLogStockTrace({ trace }: { trace: ActivityStockTrace }) {
  if (trace.stock_movements.length === 0) return null;

  const isDeduct = trace.stock_direction === "deduct";

  return (
    <div className="mt-2 rounded-lg border border-zinc-200/90 bg-zinc-50/80 px-2.5 py-2 dark:border-zinc-700/90 dark:bg-zinc-950/50 sm:px-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {isDeduct ? "Stock descontado" : "Stock devuelto"}
      </p>
      <p className="mt-0.5 text-[11px] text-zinc-600 dark:text-zinc-300">
        {stockTraceSummaryLabel(trace)}
      </p>
      <ul className="mt-2 space-y-1.5">
        {trace.stock_movements.map((m) => {
          const localRange = formatStockBeforeAfter(m.local_before, m.local_after);
          const whRange = formatStockBeforeAfter(m.warehouse_before, m.warehouse_after);
          return (
            <li
              key={`${m.product_id}-${m.context ?? "line"}`}
              className="text-[11px] leading-snug text-zinc-700 dark:text-zinc-200"
            >
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                <Link
                  href={`/admin/products/${m.product_id}`}
                  className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                >
                  {m.product_name}
                </Link>
                <span
                  className={`tabular-nums font-semibold ${
                    isDeduct
                      ? "text-amber-800 dark:text-amber-200"
                      : "text-emerald-800 dark:text-emerald-200"
                  }`}
                >
                  {formatStockLocationDelta(m.local_delta, m.warehouse_delta)}
                </span>
              </div>
              {m.context ? (
                <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">{m.context}</p>
              ) : null}
              {(localRange || whRange) && (
                <p className="mt-0.5 text-[10px] tabular-nums text-zinc-500 dark:text-zinc-400">
                  {localRange ? (
                    <span>
                      Tienda: {localRange}
                      {whRange ? " · " : null}
                    </span>
                  ) : null}
                  {whRange ? <span>Depósito: {whRange}</span> : null}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
