/** Producto visible en tienda: publicado y con ruta de imagen en Storage. */
export function productHasStorefrontImage(imagePath: unknown): boolean {
  return typeof imagePath === "string" && imagePath.trim().length > 0;
}

/** Filtro Supabase para listados de catálogo en la tienda. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- encadena builders de PostgREST sin TS infinito
export function withStorefrontImage(query: any): any {
  return query.not("image_path", "is", null).neq("image_path", "");
}

export function filterRowsWithStorefrontImage<
  T extends { image_path?: unknown },
>(rows: T[]): T[] {
  return rows.filter((row) => productHasStorefrontImage(row.image_path));
}
