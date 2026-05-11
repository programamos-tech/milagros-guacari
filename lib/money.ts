export function formatCop(cents: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(cents);
}

/** Eje de gráficos: mismo tipo de valor que `formatCop`, notación compacta. */
export function formatCopCompact(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "$ 0";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(n);
}

/** Valor entero en pesos para inputs admin: vacío si es 0; miles con punto (es-CO). */
export function formatCopInputGrouping(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "";
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(Math.floor(n));
}

/** Stock y cantidades: mismo formato de miles (es-CO). */
export const formatQuantityInputGrouping = formatCopInputGrouping;

/** Solo dígitos → entero ≥ 0 (quita ceros a la izquierda al interpretar el número). */
export function parseCopInputDigitsToInt(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return 0;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, Number.MAX_SAFE_INTEGER);
}
