export type VentasFilterStats = {
  totalCents: number;
  cashCents: number;
  transferCents: number;
  mixedCents: number;
  otherCents: number;
  paidCount: number;
};

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
