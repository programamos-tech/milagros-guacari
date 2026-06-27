/** Monto mínimo en pesos COP (mismo formato que `price_cents`) para envío gratuito. */
export const storeFreeShippingMinCents = (() => {
  const raw = process.env.NEXT_PUBLIC_STORE_FREE_SHIPPING_MIN?.trim();
  if (!raw) return 180_000;
  const n = Number(raw.replace(/\D/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 180_000;
})();

export function freeShippingProgress(subtotalCents: number) {
  const threshold = storeFreeShippingMinCents;
  if (threshold <= 0) {
    return { threshold: 0, remainingCents: 0, progressPct: 100, qualified: true };
  }
  const remainingCents = Math.max(0, threshold - subtotalCents);
  const progressPct = Math.min(
    100,
    Math.round((subtotalCents / threshold) * 100),
  );
  return {
    threshold,
    remainingCents,
    progressPct,
    qualified: remainingCents === 0,
  };
}
