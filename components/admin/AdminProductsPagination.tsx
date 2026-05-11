import Link from "next/link";
import {
  adminProductsListHref,
  clampAdminProductsPageSize,
  type AdminProductsListQuery,
} from "@/lib/admin-products-url";

type Props = {
  page: number;
  pageSize: number;
  totalCount: number;
  filters: Pick<AdminProductsListQuery, "q" | "status" | "category_id" | "categories">;
};

function href(base: AdminProductsListQuery): string {
  return adminProductsListHref(base);
}

export function AdminProductsPagination({
  page,
  pageSize,
  totalCount,
  filters,
}: Props) {
  const q = filters.q ?? "";
  const status = filters.status ?? "all";
  const category_id = filters.category_id ?? "";
  const categories = filters.categories ?? false;

  const safeSize = clampAdminProductsPageSize(pageSize);
  const totalPages = Math.max(1, Math.ceil(totalCount / safeSize));
  const cur = Math.min(Math.max(1, page), totalPages);

  const from = totalCount === 0 ? 0 : (cur - 1) * safeSize + 1;
  const to = Math.min(cur * safeSize, totalCount);

  const base = (): AdminProductsListQuery => ({
    q,
    status,
    category_id,
    per_page: safeSize,
    categories,
  });

  const prevHref =
    cur > 1
      ? href({ ...base(), page: cur - 1 })
      : null;
  const nextHref =
    cur < totalPages
      ? href({ ...base(), page: cur + 1 })
      : null;

  const linkClass =
    "rounded-lg px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-100";
  const linkActive = "bg-zinc-900 text-white hover:bg-zinc-800";
  const linkMuted = "text-zinc-400";

  const windowPages = (): number[] => {
    const win = 2;
    let start = Math.max(1, cur - win);
    let end = Math.min(totalPages, cur + win);
    if (end - start < 4) {
      if (start === 1) end = Math.min(totalPages, start + 4);
      else if (end === totalPages) start = Math.max(1, end - 4);
    }
    const out: number[] = [];
    for (let i = start; i <= end; i++) out.push(i);
    return out;
  };

  return (
    <div className="flex flex-col gap-4 border-t border-zinc-100 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <p className="text-sm text-zinc-600">
        Mostrando{" "}
        <span className="font-semibold tabular-nums text-zinc-900">
          {from}-{to}
        </span>{" "}
        de <span className="font-semibold tabular-nums text-zinc-900">{totalCount}</span>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {prevHref ? (
          <Link
            href={prevHref}
            className={`${linkClass} border border-zinc-200 bg-white text-zinc-800 shadow-sm`}
          >
            Anterior
          </Link>
        ) : (
          <span className={`${linkClass} ${linkMuted} cursor-not-allowed`} aria-disabled>
            Anterior
          </span>
        )}

        <nav className="flex flex-wrap items-center gap-1" aria-label="Páginas">
          {windowPages().map((p) => (
            <Link
              key={p}
              href={href({ ...base(), page: p })}
              className={`${linkClass} min-w-[2.25rem] text-center ${p === cur ? linkActive : "text-zinc-700"}`}
              aria-current={p === cur ? "page" : undefined}
            >
              {p}
            </Link>
          ))}
        </nav>

        {nextHref ? (
          <Link
            href={nextHref}
            className={`${linkClass} border border-zinc-200 bg-white text-zinc-800 shadow-sm`}
          >
            Siguiente
          </Link>
        ) : (
          <span className={`${linkClass} ${linkMuted} cursor-not-allowed`} aria-disabled>
            Siguiente
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-zinc-500">Por página</span>
        <div className="flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
          {([10, 25, 50, 100] as const).map((n) => (
            <Link
              key={n}
              href={href({ ...base(), page: 1, per_page: n })}
              className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                safeSize === n
                  ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200"
                  : "text-zinc-600 hover:bg-white/80"
              }`}
            >
              {n}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
