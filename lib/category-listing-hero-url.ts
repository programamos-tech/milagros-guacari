import { storagePublicObjectUrl } from "@/lib/storage-public-url";

/**
 * URL final para la imagen hero del listado por categoría.
 * - `https://...` → tal cual
 * - `/ruta/...` → estático en public u origen absoluto del sitio
 * - `bucket/clave` (incluye `/`) → Supabase Storage vía {@link storagePublicObjectUrl}
 * - `archivo.jpg` sin slash → `/archivo.jpg` (public/)
 */
export function resolveCategoryListingHeroSrc(
  path: string | null | undefined,
): string | null {
  if (!path?.trim()) return null;
  const p = path.trim();
  if (/^https?:\/\//i.test(p)) return p;
  if (p.startsWith("/")) return p;
  if (p.includes("/")) {
    return storagePublicObjectUrl(p);
  }
  return `/${p.replace(/^\//, "")}`;
}
