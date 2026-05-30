/**
 * Marca Milagros — rosa principal y variaciones para la vitrina.
 * Expuestos en `body` como `--store-accent`, `--store-brand`, etc. (ver `app/layout.tsx`).
 * La franja del header usa `--store-header-bg` / `--store-header-fg` (ver `app/(store)/layout.tsx`).
 */
export const STORE_BRAND = "#FF76A1" as const;
export const STORE_BRAND_HOVER = "#E85A8E" as const;

export const STORE_ACCENT = STORE_BRAND;
export const STORE_ACCENT_HOVER = STORE_BRAND_HOVER;

export const STORE_HEADER_BG = STORE_BRAND;
export const STORE_HEADER_FG = "#ffffff" as const;

/** Contenedor ancho completo de la vitrina (sin max-width). */
export const storeShellClass = "w-full min-w-0 px-3 sm:px-4 md:px-5 lg:px-6";

/** Margen horizontal negativo para carruseles al borde del shell. */
export const storeShellBleedXClass = "-mx-3 sm:-mx-4 md:-mx-5 lg:-mx-6";

/** Franja superior de avisos (marquee). */
export const STORE_ANNOUNCEMENT_BG = "#fff5f8" as const;

/** Fondo del pozo de imagen en tarjetas (gris muy claro). */
export const STORE_IMAGE_WELL = "#ebebeb" as const;
/** Variante rosada suave para columnas editoriales. */
export const STORE_IMAGE_WELL_TINT = "#fce8ef" as const;

/** Marco 4:5 compartido en tarjetas de producto (catálogo, destacados, sugeridos). */
export const storeProductImageFrameClass =
  "relative aspect-[4/5] w-full shrink-0 overflow-hidden";

/** Imagen dentro del marco: encaja completa sin recortes desiguales. */
export const storeProductImageMediaClass =
  "object-contain object-center p-4 sm:p-5";
