import Link from "next/link";

type VentasPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  buildHref: (page: number) => string;
};

export function VentasPagination({
  page,
  pageSize,
  total,
  buildHref,
}: VentasPaginationProps) {
  if (total <= pageSize) return null;

  const totalPages = Math.ceil(total / pageSize);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const linkClass =
    "inline-flex min-h-9 min-w-[2.25rem] items-center justify-center rounded-lg border border-rose-200/70 bg-white px-3 text-sm font-medium text-rose-950 shadow-sm transition hover:border-rose-300/80 hover:bg-rose-50/50 disabled:pointer-events-none disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:shadow-none dark:hover:border-zinc-600 dark:hover:bg-zinc-800";
  const navLinkClass = `${linkClass} px-4`;

  return (
    <div className="flex flex-col gap-3 rounded-b-xl border-t border-zinc-100 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between md:px-5">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Mostrando{" "}
        <span className="font-medium text-zinc-800 dark:text-zinc-200">
          {from}–{to}
        </span>{" "}
        de <span className="font-medium text-zinc-800 dark:text-zinc-200">{total}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs text-zinc-400 dark:text-zinc-500">
          Página {page} de {totalPages}
        </span>
        {page > 1 ? (
          <Link href={buildHref(page - 1)} className={navLinkClass}>
            Anterior
          </Link>
        ) : (
          <span
            className={`${navLinkClass} cursor-not-allowed opacity-40`}
            aria-disabled
          >
            Anterior
          </span>
        )}
        {page < totalPages ? (
          <Link href={buildHref(page + 1)} className={navLinkClass}>
            Siguiente
          </Link>
        ) : (
          <span
            className={`${navLinkClass} cursor-not-allowed opacity-40`}
            aria-disabled
          >
            Siguiente
          </span>
        )}
      </div>
    </div>
  );
}
