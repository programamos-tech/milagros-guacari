export type TicketTrendPoint = {
  /** Primer día del mes en UTC `YYYY-MM` */
  monthKey: string;
  /** Ticket promedio del mes (ventas pagadas). */
  avgCents: number;
  /** Cantidad de ventas pagadas en ese mes. */
  orderCount: number;
};

/**
 * Agrupa pedidos pagados por mes (UTC) y calcula el ticket promedio mensual.
 */
export function averageTicketByMonthFromPaidOrders(
  ordersPaid: { total_cents: number; created_at: string | null }[],
): TicketTrendPoint[] {
  const byMonth = new Map<string, { sum: number; n: number }>();
  for (const o of ordersPaid) {
    if (!o.created_at || typeof o.created_at !== "string") continue;
    const mk = new Date(o.created_at).toISOString().slice(0, 7);
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
