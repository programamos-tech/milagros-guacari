/**
 * URL pública de imagen: ruta en Storage (`product-images/...`, `store-banners/...`) o URL absoluta.
 */
export function storagePublicObjectUrl(path: string | null | undefined) {
  if (!path) return null;
  const p = path.trim();
  if (/^https?:\/\//i.test(p)) return p;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return null;
  return `${base}/storage/v1/object/public/${p}`;
}

/** Supabase local: el optimizador de `next/image` suele fallar al fetchear 127.0.0.1 / localhost. */
export function shouldUnoptimizeStorageImageUrl(
  src: string | null | undefined,
): boolean {
  if (!src) return false;
  try {
    const u = new URL(src);
    return u.hostname === "127.0.0.1" || u.hostname === "localhost";
  } catch {
    return false;
  }
}
