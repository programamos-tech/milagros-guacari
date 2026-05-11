/**
 * El precio guardado en `products.price_cents` es la base **sin IVA**.
 * El precio final al cliente (POS / etiqueta con IVA) =
 *   base × (1 + vat_percent/100) cuando `has_vat`.
 */

export function unitPriceNetCents(price_cents: number): number {
  return Math.max(0, Math.round(Number(price_cents ?? 0)));
}

export function unitPriceGrossCents(
  price_cents: number,
  has_vat: boolean | null | undefined,
  vat_percent: number | null | undefined,
): number {
  const base = unitPriceNetCents(price_cents);
  if (!has_vat) return base;
  const pct = Math.max(0, Number(vat_percent ?? 0));
  return Math.round(base * (1 + pct / 100));
}

export function unitVatAmountCents(
  price_cents: number,
  has_vat: boolean | null | undefined,
  vat_percent: number | null | undefined,
): number {
  const net = unitPriceNetCents(price_cents);
  const gross = unitPriceGrossCents(price_cents, has_vat, vat_percent);
  return Math.max(0, gross - net);
}
