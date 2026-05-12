/**
 * URL pública del sitio (checkout, redirects Wompi, etc.).
 *
 * Orden: `NEXT_PUBLIC_SITE_URL` (override) → `VERCEL_URL` (inyectada por Vercel en cada deploy)
 * → `http://localhost:3000` en desarrollo local.
 */
export function getPublicSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}`;
  }

  return "http://localhost:3000";
}
