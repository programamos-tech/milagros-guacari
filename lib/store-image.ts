/**
 * Calidad del optimizador `next/image` en la vitrina.
 * 75 (default de Next) suele verse suave en móvil retina; 90 mantiene nitidez sin pesar mucho más.
 */
export const STORE_IMAGE_QUALITY = 90;

/** Tarjetas de catálogo / destacados (2–4 columnas según viewport). */
export const STORE_PRODUCT_CARD_IMAGE_SIZES =
  "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 28vw";

/** PDP: imagen principal a ancho casi completo en móvil. */
export const STORE_PRODUCT_DETAIL_IMAGE_SIZES =
  "(max-width: 1024px) 100vw, 50vw";
