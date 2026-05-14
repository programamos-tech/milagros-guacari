/**
 * Descuento manual POS sobre el **neto total de la línea** (tras precio mayorista),
 * antes de IVA. Si `discountPercent` es un entero 1–100, aplica % y se ignora el monto.
 * Si no hay % válido, aplica `discountAmountCents` como COP (centavos) sobre el neto de línea
 * (no mayor que el neto antes del descuento).
 */
export function applyPosLineNetDiscountCents(
  lineNetBeforeCents: number,
  discountPercent: number | null | undefined,
  discountAmountCents: number | null | undefined,
): number {
  const before = Math.max(0, Math.floor(Number(lineNetBeforeCents ?? 0)));
  const pctRaw =
    discountPercent != null && Number.isFinite(Number(discountPercent))
      ? Math.floor(Number(discountPercent))
      : 0;
  if (pctRaw > 0 && pctRaw <= 100) {
    return Math.max(0, Math.floor((before * (100 - pctRaw)) / 100));
  }
  const amt = Math.max(0, Math.floor(Number(discountAmountCents ?? 0)));
  if (amt > 0) return Math.max(0, before - Math.min(amt, before));
  return before;
}

export function discountedUnitNetCentsFromLine(
  lineNetAfterCents: number,
  quantity: number,
): number {
  const q = Math.max(1, Math.floor(Number(quantity ?? 1)));
  return Math.floor(Math.max(0, lineNetAfterCents) / q);
}
