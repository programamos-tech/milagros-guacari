/**
 * Calidad del optimizador `next/image` en la vitrina.
 * 86: nitidez en retina sin volver a archivos enormes.
 */
export const STORE_IMAGE_QUALITY = 86;

/** PDP: más calidad — aquí el blur se nota (y hay zoom al hover). */
export const STORE_PRODUCT_DETAIL_IMAGE_QUALITY = 90;

/** Banners hero / catálogo. */
export const STORE_BANNER_IMAGE_QUALITY = 82;

/**
 * Tarjetas 2–4 columnas.
 * En desktop ~1/4 del viewport; tope 420px CSS ≈ 840px @2x (deviceSizes).
 */
export const STORE_PRODUCT_CARD_IMAGE_SIZES =
  "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1536px) 25vw, 420px";

/** PDP: imagen principal (mitad de layout en desktop, full en móvil). */
export const STORE_PRODUCT_DETAIL_IMAGE_SIZES =
  "(max-width: 1024px) 100vw, 720px";

/** Hero home / banner catálogo. */
export const STORE_BANNER_IMAGE_SIZES =
  "(max-width: 768px) 100vw, (max-width: 1280px) 1400px, 1600px";

/** Primeras N cards con priority (LCP). */
export const STORE_CARD_PRIORITY_COUNT = 4;
