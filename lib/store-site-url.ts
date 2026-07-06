/** URL pública de la tienda (emails de auth, redirects). */
export function storePublicSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "https://milagros-guacari.vercel.app";
}

export function storeAuthCallbackUrl(nextPath = "/cuenta"): string {
  const base = storePublicSiteUrl();
  const next =
    nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/cuenta";
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`;
}
