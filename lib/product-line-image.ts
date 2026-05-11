/** Imagen de línea de carrito según fragancia elegida (mapa en producto). */
export function imagePathForProductLine(
  imagePath: string | null | undefined,
  fragranceOptionImages: unknown,
  fragrance?: string | null,
): string | null {
  const f = typeof fragrance === "string" ? fragrance.trim() : "";
  if (!f) return imagePath ?? null;
  const m = fragranceOptionImages;
  if (!m || typeof m !== "object" || Array.isArray(m)) return imagePath ?? null;
  const raw = (m as Record<string, unknown>)[f];
  const path = typeof raw === "string" ? raw.trim() : "";
  return path ? path : imagePath ?? null;
}
