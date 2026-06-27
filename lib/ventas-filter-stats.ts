import { sumPosPaymentBreakdowns } from "@/lib/pos-payment-breakdown";

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
  pos_mixed_cash_cents?: number | null;
  pos_mixed_transfer_cents?: number | null;
}[]): VentasFilterStats {
  let totalCents = 0;
  let paidCount = 0;

  for (const r of rows) {
    if (r.status !== "paid") continue;
    paidCount += 1;
    totalCents += Math.max(0, Math.round(Number(r.total_cents ?? 0)));
  }

  const buckets = sumPosPaymentBreakdowns(rows);

  return {
    totalCents,
    cashCents: buckets.cashCents,
    transferCents: buckets.transferCents,
    mixedCents: buckets.mixedCents,
    otherCents: buckets.otherCents,
    paidCount,
  };
}
