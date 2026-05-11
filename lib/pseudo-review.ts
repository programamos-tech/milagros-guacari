/** Valor estable solo para UI hasta tener reseñas reales en DB. */
export function pseudoReviewCount(productId: string): number {
  let h = 0;
  for (let i = 0; i < productId.length; i++) {
    h = (h * 31 + productId.charCodeAt(i)) >>> 0;
  }
  return 8 + (h % 180);
}
