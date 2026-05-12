/**
 * El precio guardado en `products.price_cents` es la base **sin IVA**.
 * El precio final al cliente (POS / etiqueta con IVA) =
 *   base × (1 + IVA/100) cuando `has_vat`, con IVA **fijo** al tipo general CO (19 %).
 *
 * No se “ajusta” el porcentaje al bruto redondeado del catálogo: `vat_percent` en BD
 * queda en 19 para referencia; los cálculos usan siempre `SALE_VAT_PERCENT`.
 */

/** IVA general ventas bienes Colombia (información / cálculo único). */
export const SALE_VAT_PERCENT = 19;

export function unitPriceNetCents(price_cents: number): number {
  return Math.max(0, Math.round(Number(price_cents ?? 0)));
}

export function unitPriceGrossCents(
  price_cents: number,
  has_vat: boolean | null | undefined,
  _vat_percent: number | null | undefined,
): number {
  const base = unitPriceNetCents(price_cents);
  if (!has_vat) return base;
  return Math.round(base * (1 + SALE_VAT_PERCENT / 100));
}

export function unitVatAmountCents(
  price_cents: number,
  has_vat: boolean | null | undefined,
  _vat_percent: number | null | undefined,
): number {
  const net = unitPriceNetCents(price_cents);
  const gross = unitPriceGrossCents(price_cents, has_vat, null);
  return Math.max(0, gross - net);
}

/** Etiqueta de IVA en UI (no usar `vat_percent` heredado con tasas “adaptadas”). */
export function saleVatPercentLabel(has_vat: boolean | null | undefined): number | null {
  return has_vat ? SALE_VAT_PERCENT : null;
}

/**
 * Unitario cobrado en POS (típico: **con IVA** en el ticket) → base sin IVA por unidad.
 * Si el producto no lleva IVA, el cobrado es la base.
 */
export function unitNetFromPosChargedUnitCents(
  chargedUnitCents: number,
  has_vat: boolean | null | undefined,
  _vat_percent: number | null | undefined,
): number {
  const g = Math.max(0, Math.round(Number(chargedUnitCents ?? 0)));
  if (!has_vat) return g;
  return Math.round(g / (1 + SALE_VAT_PERCENT / 100));
}
