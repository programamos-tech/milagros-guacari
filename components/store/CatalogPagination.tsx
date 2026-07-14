import Link from "next/link";

type Props = {
  currentPage: number;
  totalPages: number;
  /** Query string sin `page` (puede ir vacío). */
  baseQuery: string;
};

function pageHref(baseQuery: string, page: number): string {
  const params = new URLSearchParams(baseQuery);
  if (page <= 1) params.delete("page");
  else params.set("page", String(page));
  const q = params.toString();
  return q ? `/products?${q}` : "/products";
}

/** Paginación sencilla del catálogo filtrado. */
export function CatalogPagination({
  currentPage,
  totalPages,
  baseQuery,
}: Props) {
  if (totalPages <= 1) return null;

  const prev = currentPage > 1 ? currentPage - 1 : null;
  const next = currentPage < totalPages ? currentPage + 1 : null;

  return (
    <nav
      className="flex flex-col items-center gap-4 border-t border-stone-100 pt-10"
      aria-label="Paginación del catálogo"
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">
        Página {currentPage} de {totalPages}
      </p>
      <div className="flex items-center gap-3">
        {prev != null ? (
          <Link
            href={pageHref(baseQuery, prev)}
            className="border border-stone-300 bg-white px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-800 transition hover:border-[var(--store-accent)] hover:text-[var(--store-accent)]"
            rel="prev"
          >
            Anterior
          </Link>
        ) : (
          <span className="border border-stone-100 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-300">
            Anterior
          </span>
        )}
        {next != null ? (
          <Link
            href={pageHref(baseQuery, next)}
            className="bg-[var(--store-accent)] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--store-accent-hover)]"
            rel="next"
          >
            Siguiente
          </Link>
        ) : (
          <span className="bg-stone-200 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
            Siguiente
          </span>
        )}
      </div>
    </nav>
  );
}
