/**
 * Calidad del optimizador `next/image` en la vitrina.
 * 75–80: buen balance peso/nitidez en móvil; 90 pedía de más al optimizer.
 */
export const STORE_IMAGE_QUALITY = 75;

/** Banners hero / catálogo: un poco más de calidad, ancho tope vía `sizes`. */
export const STORE_BANNER_IMAGE_QUALITY = 78;

/** Tarjetas de catálogo / destacados (2–4 columnas). Evita pedir 100vw. */
export const STORE_PRODUCT_CARD_IMAGE_SIZES =
  "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px";

/** PDP: imagen principal. */
export const STORE_PRODUCT_DETAIL_IMAGE_SIZES =
  "(max-width: 1024px) 100vw, 560px";

/** Hero home / banner catálogo: no pedir 4K. */
export const STORE_BANNER_IMAGE_SIZES =
  "(max-width: 768px) 100vw, (max-width: 1280px) 1200px, 1400px";

/** Primeras N cards con priority (LCP). */
export const STORE_CARD_PRIORITY_COUNT = 4;
