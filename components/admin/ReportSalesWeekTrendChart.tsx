import { TrendingDown, TrendingUp } from "lucide-react";
import { formatCop, formatCopCompact } from "@/lib/money";
import type { TicketTrendPoint } from "@/lib/customer-ticket-trend";
import type { ReportSalesTrendComparison } from "@/lib/admin-reports-data";

const chartPaletteClass =
  "[--chart-line:#881337] [--chart-grid:#f4f4f5] [--chart-axis:#a1a1aa] [--chart-point-fill:#ffffff] [--chart-point-stroke:#881337] [--chart-prior-line:#b45309] [--chart-prior-point-fill:#fffbeb] [--chart-prior-point-stroke:#b45309] dark:[--chart-line:#fda4af] dark:[--chart-grid:#3f3f46] dark:[--chart-axis:#71717a] dark:[--chart-point-fill:#27272a] dark:[--chart-point-stroke:#fda4af] dark:[--chart-prior-line:#fbbf24] dark:[--chart-prior-point-fill:#422006] dark:[--chart-prior-point-stroke:#fbbf24]";

function xLabelForPoint(p: TicketTrendPoint) {
  if (p.labelX) return p.labelX;
  if (/^\d{4}-\d{2}-\d{2}$/.test(p.monthKey)) {
    return new Date(`${p.monthKey}T12:00:00`).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
    });
  }
  return p.monthKey.slice(0, 8);
}

export function ReportSalesWeekTrendChart({
  points,
  comparison,
  fillGradientId = "reportsSalesWeekTrendFill",
}: {
  points: TicketTrendPoint[];
  comparison: ReportSalesTrendComparison;
  fillGradientId?: string;
}) {
  if (points.length === 0) return null;

  const trend = points.map((p) => ({
    ...p,
    currentValue: p.avgCents,
    priorValue: Math.max(0, Math.floor(Number(p.priorWeekCents ?? 0))),
    key: p.monthKey,
  }));

  const maxIncome = Math.max(
    ...trend.map((t) => t.currentValue),
    ...trend.map((t) => t.priorValue),
    0,
  );
  const maxTrend = maxIncome > 0 ? maxIncome : 1;
  const yMax = maxTrend * 1.1;

  const chartW = 1000;
  const chartH = 280;
  const padL = 54;
  const padR = 10;
  const padT = 16;
  const padB = 44;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const xAt = (i: number) => {
    if (trend.length === 1) return padL + plotW / 2;
    return padL + (i / Math.max(1, trend.length - 1)) * plotW;
  };
  const yAt = (v: number) => padT + plotH - (v / yMax) * plotH;

  const currentPolyline = trend.map((t, i) => `${xAt(i)},${yAt(t.currentValue)}`).join(" ");
  const priorPolyline = trend.map((t, i) => `${xAt(i)},${yAt(t.priorValue)}`).join(" ");

  let areaPath: string;
  if (trend.length === 1) {
    const x = xAt(0);
    const y = yAt(trend[0].currentValue);
    const w = Math.min(48, plotW / 4);
    areaPath = `M ${x - w} ${padT + plotH} L ${x} ${y} L ${x + w} ${padT + plotH} Z`;
  } else {
    areaPath = `M ${xAt(0)} ${padT + plotH} ${trend
      .map((t, i) => `L ${xAt(i)} ${yAt(t.currentValue)}`)
      .join(" ")} L ${xAt(trend.length - 1)} ${padT + plotH} Z`;
  }

  const gridSteps = 4;
  const yTicks: number[] = [];
  for (let s = 0; s <= gridSteps; s += 1) {
    yTicks.push((yMax * s) / gridSteps);
  }

  const { changePercent, currentTotalCents, priorTotalCents } = comparison;
  const improving = changePercent != null && changePercent > 0;
  const declining = changePercent != null && changePercent < 0;
  const flat = changePercent === 0;

  return (
    <div className={`w-full min-w-0 ${chartPaletteClass}`}>
      <div className="flex flex-wrap items-end justify-between gap-4 px-6 pb-4 sm:px-8">
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Esta semana
            </p>
            <p className="mt-0.5 text-xl font-normal tabular-nums text-zinc-900 dark:text-zinc-100">
              {formatCop(currentTotalCents)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Semana anterior
            </p>
            <p className="mt-0.5 text-xl font-normal tabular-nums text-zinc-500 dark:text-zinc-400">
              {formatCop(priorTotalCents)}
            </p>
          </div>
        </div>

        {changePercent != null ? (
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium tabular-nums ${
              improving
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                : declining
                  ? "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {improving ? (
              <TrendingUp className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            ) : declining ? (
              <TrendingDown className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            ) : null}
            {flat ? "Sin cambio" : `${changePercent > 0 ? "+" : ""}${changePercent}%`}
          </div>
        ) : (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            Sin ventas la semana anterior
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-6 pb-2 sm:px-8">
        <span className="inline-flex items-center gap-2 text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
          <span
            className="size-2.5 shrink-0 rounded-full ring-2 ring-rose-900/25 dark:ring-rose-300/30"
            style={{ backgroundColor: "var(--chart-line)" }}
            aria-hidden
          />
          Esta semana
        </span>
        <span className="inline-flex items-center gap-2 text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
          <span
            className="size-2.5 shrink-0 rounded-sm ring-2 ring-amber-700/25 dark:ring-amber-300/35"
            style={{ backgroundColor: "var(--chart-prior-line)" }}
            aria-hidden
          />
          Semana anterior
        </span>
      </div>

      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="block h-auto w-full min-w-0"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Ventas diarias: esta semana en rojo y semana anterior en ámbar"
      >
        <title>Ventas esta semana vs semana anterior</title>
        <defs>
          <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-line)" stopOpacity="0.14" />
            <stop offset="100%" stopColor="var(--chart-line)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((tick, idx) => {
          const y = yAt(tick);
          const isBottom = idx === 0;
          return (
            <g key={`grid-${idx}`}>
              {!isBottom ? (
                <line
                  x1={padL}
                  y1={y}
                  x2={padL + plotW}
                  y2={y}
                  stroke="var(--chart-grid)"
                  strokeWidth={1}
                  strokeDasharray="4 6"
                />
              ) : null}
              <text
                x={padL - 10}
                y={y + 4}
                textAnchor="end"
                className="fill-zinc-500 dark:fill-zinc-400"
                style={{ fontSize: "11px" }}
              >
                {formatCopCompact(Math.round(tick))}
              </text>
            </g>
          );
        })}

        <line
          x1={padL}
          y1={padT + plotH}
          x2={padL + plotW}
          y2={padT + plotH}
          stroke="var(--chart-axis)"
          strokeWidth={1.25}
        />
        <line
          x1={padL}
          y1={padT}
          x2={padL}
          y2={padT + plotH}
          stroke="var(--chart-axis)"
          strokeWidth={1.25}
        />

        <path d={areaPath} fill={`url(#${fillGradientId})`} />

        {trend.length > 1 ? (
          <>
            <polyline
              fill="none"
              stroke="var(--chart-prior-line)"
              strokeWidth={2}
              strokeDasharray="7 5"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={priorPolyline}
            />
            <polyline
              fill="none"
              stroke="var(--chart-line)"
              strokeWidth={2.25}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={currentPolyline}
            />
          </>
        ) : null}

        {trend.map((t, i) => (
          <g key={t.key}>
            <title>
              {t.detail ??
                `${xLabelForPoint(t)}: ${formatCop(t.currentValue)} esta semana · ${formatCop(t.priorValue)} sem. ant.`}
            </title>
            <circle
              cx={xAt(i)}
              cy={yAt(t.priorValue)}
              r="3.5"
              fill="var(--chart-prior-point-fill)"
              stroke="var(--chart-prior-point-stroke)"
              strokeWidth={2}
            />
            <circle
              cx={xAt(i)}
              cy={yAt(t.currentValue)}
              r={trend.length === 1 ? 5 : 4}
              fill="var(--chart-point-fill)"
              stroke="var(--chart-point-stroke)"
              strokeWidth={2}
            />
          </g>
        ))}

        {trend.map((t, i) => (
          <text
            key={`xl-${t.key}`}
            x={xAt(i)}
            y={chartH - 8}
            textAnchor="middle"
            className="fill-zinc-600 dark:fill-zinc-300"
            style={{ fontSize: "11px" }}
          >
            {xLabelForPoint(t)}
          </text>
        ))}
      </svg>
    </div>
  );
}
