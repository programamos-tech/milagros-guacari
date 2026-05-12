/** Paneles del backoffice: borde suave alineado al sidebar (rosa) en claro. */
export const adminPanelClass =
  "rounded-xl border border-rose-200/45 bg-white shadow-sm ring-1 ring-rose-950/[0.04] dark:border-zinc-700/80 dark:bg-zinc-900 dark:ring-white/[0.06]";

/** Variante más redondeada (detalle cliente, ficha producto). */
export const adminPanelLgClass =
  "rounded-2xl border border-rose-200/45 bg-white shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900";

/** Contenedor de tabla con borde (listas densas). */
export const adminTableWrapClass =
  "overflow-hidden rounded-xl border border-rose-200/45 bg-white shadow-[0_1px_3px_0_rgb(190_24_93/0.05)] dark:border-zinc-700/80 dark:bg-zinc-900 dark:shadow-[0_1px_0_0_rgb(0_0_0/0.35)]";

/** Tarjeta responsive (p. ej. listado de productos en vista móvil/tablet). */
export const adminProductCardClass =
  "flex h-full flex-col rounded-xl border border-rose-200/45 bg-white p-4 shadow-sm ring-1 ring-rose-950/[0.04] transition hover:border-rose-300/60 hover:shadow-md dark:border-zinc-700/90 dark:bg-zinc-900 dark:ring-white/[0.06] dark:hover:border-zinc-600 dark:hover:shadow-lg";

/** Cancelar / secundario en modales y barras (claro: borde rosa, texto rose-950). */
export const adminButtonCancelClass =
  "rounded-lg border border-rose-200/70 bg-white px-4 py-2.5 text-sm font-semibold text-rose-950 shadow-sm transition hover:border-rose-300/80 hover:bg-rose-50/60 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:shadow-none dark:hover:bg-zinc-700";

/** Acción secundaria ancha (p. ej. Imprimir, Actualizar lista). */
export const adminButtonToolbarOutlineClass =
  "inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200/70 bg-white px-4 py-2.5 text-sm font-medium text-rose-950 shadow-sm transition hover:border-rose-300/80 hover:bg-rose-50/50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:shadow-none dark:hover:border-zinc-600 dark:hover:bg-zinc-800 sm:w-auto";
