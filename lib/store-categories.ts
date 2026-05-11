/**
 * @deprecated Los menús de categoría usan `fetchStoreCategoriesWithCounts`.
 * Se mantiene el archivo por si algún import legacy lo espera.
 */
export function distributeProductCounts(total: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  const rem = total % n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}
