import { formatCop, formatCopCompact } from "@/lib/money";
import type { TicketTrendPoint } from "@/lib/customer-ticket-trend";

/** Línea guinda del admin; rejilla y ejes en zinc. */
const chartPaletteClass =
  "[--chart-line:#881337] [--chart-grid:#f4f4f5] [--chart-axis:#a1a1aa] [--chart-point-fill:#ffffff] [--chart-point-stroke:#881337] dark:[--chart-line:#fda4af] dark:[--chart-grid:#3f3f46] dark:[--chart-axis:#71717a] dark:[--chart-point-fill:#27272a] dark:[--chart-point-stroke:#fda4af]";

function monthLabelEs(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("es-CO", {
    month: "short",
    year: "numeric",
  });
}

function xLabelForPoint(p: TicketTrendPoint, seriesKind: "day" | "month") {
  if (p.labelX) return p.labelX;
  if (seriesKind === "month" || /^\d{4}-\d{2}$/.test(p.monthKey)) {
    return monthLabelEs(p.monthKey);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(p.monthKey)) {
    return new Date(`${p.monthKey}T12:00:00`).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
    });
  }
  return p.monthKey.slice(0, 8);
}

function pointTooltipTitle(p: TicketTrendPoint, value: number, seriesKind: "day" | "month") {
  if (p.detail) return p.detail;
  const head = xLabelForPoint(p, seriesKind);
  return `${head}: ${formatCop(value)} · ${p.orderCount} venta${p.orderCount === 1 ? "" : "s"}`;
}

type ChartPoint = TicketTrendPoint & { value: number; key: string };

function catmullRomToBezierPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0]!.x} ${points[0]!.y}`;
  let d = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(points.length - 1, i + 2)]!;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
  }
  return d;
}

export function CustomerTicketTrendChart({
  points,
  seriesKind,
  peakCaption,
  secondaryCaption,
  fillGradientId = "customerTicketChartFill",
}: {
  points: TicketTrendPoint[];
  /** `day`: ticket promedio por día con ventas. `month`: promedio por mes. */
  seriesKind: "day" | "month";
  /** Reemplaza el texto del pico (pie). Si no se envía, se usa el copy del detalle de cliente. */
  peakCaption?: string;
  /**
   * Segunda línea bajo el gráfico.
   * `undefined` = texto por defecto solo en modo día (detalle cliente).
   * `null` = no mostrar.
   */
  secondaryCaption?: string | null;
  /** Id único del degradado (evita colisiones si hay varios SVG en la misma página). */
  fillGradientId?: string;
}) {
  if (points.length === 0) return null;

  const trend: ChartPoint[] = points.map((p) => ({
    ...p,
    value: p.avgCents,
    key: p.monthKey,
  }));

  const maxRaw = Math.max(...trend.map((t) => t.value), 0);
  const maxTrend = maxRaw > 0 ? maxRaw : 1;
  const yMax = maxTrend * 1.08;

  const xLabelStep =
    trend.length <= 12 ? 1 : Math.max(1, Math.ceil(trend.length / 10));

  const chartW = 1000;
  const chartH = 300;
  const padL = 54;
  const padR = 10;
  const padT = 20;
  const padB = 48;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const xAt = (i: number) => {
    if (trend.length === 1) return padL + plotW / 2;
    return padL + (i / Math.max(1, trend.length - 1)) * plotW;
  };
  const yAt = (v: number) => padT + plotH - (v / yMax) * plotH;

  const pts = trend.map((t, i) => ({ x: xAt(i), y: yAt(t.value) }));
  const smoothStrokePath =
    seriesKind === "month" && pts.length > 1 ? catmullRomToBezierPath(pts) : "";

  const polylinePoints = trend.map((t, i) => `${xAt(i)},${yAt(t.value)}`).join(" ");

  let areaPath: string;
  if (trend.length === 1) {
    const x = xAt(0);
    const y = yAt(trend[0].value);
    const w = Math.min(48, plotW / 4);
    areaPath = `M ${x - w} ${padT + plotH} L ${x} ${y} L ${x + w} ${padT + plotH} Z`;
  } else {
    areaPath = `M ${xAt(0)} ${padT + plotH} ${trend
      .map((t, i) => `L ${xAt(i)} ${yAt(t.value)}`)
      .join(" ")} L ${xAt(trend.length - 1)} ${padT + plotH} Z`;
  }

  const gridSteps = 5;
  const yTicks: number[] = [];
  for (let s = 0; s <= gridSteps; s += 1) {
    yTicks.push((yMax * s) / gridSteps);
  }

  const showMarkers =
    seriesKind === "month" ? true : trend.length <= 34 || trend.length === 1;

  const defaultPeakFooter =
    seriesKind === "day"
      ? `Mayor ticket promedio en un día: ${formatCop(maxRaw)}`
      : `Pico del periodo: ${formatCop(maxRaw)} ticket promedio mensual`;
  const peakLineFooter = peakCaption ?? (maxRaw > 0 ? defaultPeakFooter : null);
  const defaultSecondaryFooter =
    seriesKind === "day"
      ? "Solo aparecen días con al menos una venta pagada. Pasá el cursor sobre la línea para ver detalle."
      : null;
  const secondaryLineFooter =
    secondaryCaption === undefined ? defaultSecondaryFooter : secondaryCaption;

  return (
    <div className={`mt-3 w-full min-w-0 ${chartPaletteClass}`}>
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="block h-auto w-full min-w-0"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={
          seriesKind === "day"
            ? "Ticket promedio diario en días con ventas pagadas"
            : "Evolución del ticket promedio por mes"
        }
      >
        <title>
          {seriesKind === "day"
            ? "Ticket promedio por día (ventas pagadas)"
            : "Ticket promedio por mes"}
        </title>
        <defs>
          <linearGradient
            id={fillGradientId}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor="var(--chart-line)" stopOpacity="0.12" />
            <stop offset="55%" stopColor="var(--chart-line)" stopOpacity="0.04" />
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

        {seriesKind === "day" && trend.length > 1 ? (
          <polyline
            fill="none"
            stroke="var(--chart-line)"
            strokeWidth={2.25}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={polylinePoints}
          />
        ) : null}

        {seriesKind === "month" && trend.length > 1 && smoothStrokePath ? (
          <path
            d={smoothStrokePath}
            fill="none"
            stroke="var(--chart-line)"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}

        {showMarkers
          ? trend.map((t, i) => (
              <g key={t.key}>
                <title>{pointTooltipTitle(t, t.value, seriesKind)}</title>
                <circle
                  cx={xAt(i)}
                  cy={yAt(t.value)}
                  r="4"
                  fill="var(--chart-point-fill)"
                  stroke="var(--chart-point-stroke)"
                  strokeWidth={2}
                />
              </g>
            ))
          : trend.map((t, i) => (
              <g key={t.key}>
                <title>{pointTooltipTitle(t, t.value, seriesKind)}</title>
                <circle
                  cx={xAt(i)}
                  cy={yAt(t.value)}
                  r="10"
                  fill="transparent"
                  stroke="none"
                  pointerEvents="all"
                />
              </g>
            ))}

        {trend.map((t, i) =>
          i % xLabelStep === 0 || i === trend.length - 1 ? (
            <text
              key={`xl-${t.key}`}
              x={xAt(i)}
              y={chartH - 10}
              textAnchor="middle"
              className="fill-zinc-600 dark:fill-zinc-300"
              style={{ fontSize: trend.length > 40 ? "9px" : "11px" }}
            >
              {xLabelForPoint(t, seriesKind)}
            </text>
          ) : null,
        )}
      </svg>
      <div className="px-6 pb-6 pt-0 sm:px-8 sm:pb-8">
        {peakLineFooter ? (
          <p className="mt-2 text-center text-xs text-zinc-400 dark:text-zinc-500">{peakLineFooter}</p>
        ) : null}
        {secondaryLineFooter ? (
          <p className="mt-1 text-center text-[11px] text-zinc-500 dark:text-zinc-400">
            {secondaryLineFooter}
          </p>
        ) : null}
      </div>
    </div>
  );
}
