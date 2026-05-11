import Link from "next/link";

function buildProductsHref(
  q: string,
  sort: string | undefined,
  categoryId: string | undefined,
) {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  if (sort && sort !== "newest") p.set("sort", sort);
  if (categoryId) p.set("category", categoryId);
  const qs = p.toString();
  return qs ? `/products?${qs}` : "/products";
}

type Props = {
  q: string;
  sort: string;
  categoryId?: string;
};

export function ProductsFilterSortBar({ q, sort, categoryId }: Props) {
  const sortPillBase =
    "inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-xs font-medium sm:text-sm";

  const sortActive = (s: string) =>
    sort === s || (s === "newest" && (sort === "" || sort === "newest"));

  const sortLink = (s: string, label: string) => {
    const active = sortActive(s);
    return (
      <Link
        href={buildProductsHref(q, s, categoryId)}
        className={`${sortPillBase} ${
          active
            ? "border border-[#6b7f6a]/80 bg-[#eef3ec] text-[#3d5240]"
            : "border border-stone-200/80 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="border-b border-stone-200/90 pb-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2">
        <button
          type="button"
          disabled
          title="Filtros avanzados disponibles en una próxima versión"
          className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-500 shadow-sm sm:text-sm cursor-not-allowed opacity-70"
        >
          Filtros
          <span className="text-stone-400" aria-hidden>
            ▾
          </span>
        </button>

        <span
          className="hidden h-4 w-px shrink-0 bg-stone-200 sm:block"
          aria-hidden
        />

        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
            Ordenar por
          </span>
          <div className="flex flex-wrap gap-2">
            {sortLink("newest", "Más recientes")}
            {sortLink("price_asc", "Menor precio")}
            {sortLink("price_desc", "Mayor precio")}
            {sortLink("name", "Nombre A–Z")}
          </div>
        </div>
      </div>
    </div>
  );
}
