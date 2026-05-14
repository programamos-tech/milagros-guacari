import { formatCop } from "@/lib/money";
import {
  prettyReportDayShortLabel,
  reportCalendarDayKeyFromIso,
  reportYearMonthFromIso,
} from "@/lib/admin-report-range";

export type TicketTrendPoint = {
  /**
   * Clave estable: `YYYY-MM` (mes) o `YYYY-MM-DD` (día con ventas).
   */
  monthKey: string;
  /** Etiqueta corta en el eje X (p. ej. "11 may"). */
  labelX?: string;
  /** Texto para tooltip. */
  detail?: string;
  /** Día calendario tienda `YYYY-MM-DD` (serie diaria). */
  dayKey?: string;
  /** Ticket promedio del bucket (mes o día). */
  avgCents: number;
  /** Pedidos pagados en el bucket. */
  orderCount: number;
  /**
   * Reportes admin (serie diaria): egresos del mismo día (`expense_date` contable).
   * Si está definido, el gráfico puede mostrar ingresos vs egresos.
   */
  expenseCents?: number;
};

/**
 * Agrupa pedidos pagados por mes (calendario tienda) y calcula el ticket promedio mensual.
 */
export function averageTicketByMonthFromPaidOrders(
  ordersPaid: { total_cents: number; created_at: string | null }[],
): TicketTrendPoint[] {
  const byMonth = new Map<string, { sum: number; n: number }>();
  for (const o of ordersPaid) {
    if (!o.created_at || typeof o.created_at !== "string") continue;
    const mk = reportYearMonthFromIso(o.created_at);
    if (!mk) continue;
    const t = Math.max(0, Math.round(Number(o.total_cents ?? 0)));
    const cur = byMonth.get(mk) ?? { sum: 0, n: 0 };
    cur.sum += t;
    cur.n += 1;
    byMonth.set(mk, cur);
  }
  const keys = [...byMonth.keys()].sort();
  return keys.map((monthKey) => {
    const { sum, n } = byMonth.get(monthKey)!;
    return {
      monthKey,
      avgCents: n > 0 ? Math.round(sum / n) : 0,
      orderCount: n,
    };
  });
}

/**
 * Un punto por **día calendario** (zona tienda) con al menos una venta: ticket promedio ese día.
 * Mucho más legible que una línea por compra. Por defecto últimos `maxDaysBack` días;
 * si no hay datos en esa ventana pero sí pedidos antiguos, se usa todo el historial.
 */
export function averageTicketByCalendarDayFromPaidOrders(
  ordersPaid: { total_cents: number; created_at: string | null }[],
  maxDaysBack: number | null = 150,
): TicketTrendPoint[] {
  const build = (cutoffMs: number | null): TicketTrendPoint[] => {
    const byDay = new Map<string, { sum: number; n: number }>();
    for (const o of ordersPaid) {
      if (!o.created_at || typeof o.created_at !== "string") continue;
      const at = new Date(o.created_at).getTime();
      if (cutoffMs !== null && at < cutoffMs) continue;
      const dk = reportCalendarDayKeyFromIso(o.created_at);
      if (!dk) continue;
      const t = Math.max(0, Math.round(Number(o.total_cents ?? 0)));
      const cur = byDay.get(dk) ?? { sum: 0, n: 0 };
      cur.sum += t;
      cur.n += 1;
      byDay.set(dk, cur);
    }
    const keys = [...byDay.keys()].sort();
    return keys.map((dayYmd) => {
      const { sum, n } = byDay.get(dayYmd)!;
      const avg = n > 0 ? Math.round(sum / n) : 0;
      const labelX = prettyReportDayShortLabel(dayYmd);
      const detail = `${labelX}: ticket prom. ${formatCop(avg)} · ${n} venta${n === 1 ? "" : "s"}`;
      return {
        monthKey: dayYmd,
        labelX,
        dayKey: dayYmd,
        detail,
        avgCents: avg,
        orderCount: n,
      };
    });
  };

  const cutoff = maxDaysBack != null ? Date.now() - maxDaysBack * 86400000 : null;
  let pts = build(cutoff);
  if (pts.length === 0 && ordersPaid.some((o) => o.created_at)) {
    pts = build(null);
  }
  return pts;
}

/**
 * Variación porcentual del ticket promedio del último mes con datos vs el mes anterior.
 * Devuelve `null` si no hay al menos dos meses o el anterior es 0.
 */
export function ticketTrendMonthOverMonthPercent(
  points: TicketTrendPoint[],
): number | null {
  if (points.length < 2) return null;
  const prev = points[points.length - 2]!.avgCents;
  const last = points[points.length - 1]!.avgCents;
  if (prev <= 0) return null;
  return Math.round(((last - prev) / prev) * 1000) / 10;
}
