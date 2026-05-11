"use client";

import { X } from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import type { SizeFacetOption } from "@/lib/product-listing-facets";

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "newest", label: "Destacados" },
  { value: "price_asc", label: "Menor precio" },
  { value: "price_desc", label: "Mayor precio" },
  { value: "name", label: "Nombre A-Z" },
];

function buildListingQuery(opts: {
  lockedCategoryId: string | null;
  brands: string[];
  colors: string[];
  sizeKeys: string[];
  categoryIds: string[];
  priceMin: number | null;
  priceMax: number | null;
  sort: string;
  q: string;
}): string {
  const p = new URLSearchParams();
  if (opts.lockedCategoryId) p.set("category", opts.lockedCategoryId);
  if (opts.brands.length > 0) p.set("brands", opts.brands.join(","));
  if (opts.colors.length > 0) p.set("colors", opts.colors.join("|"));
  if (opts.sizeKeys.length > 0) p.set("sizes", opts.sizeKeys.join("|"));
  if (!opts.lockedCategoryId && opts.categoryIds.length > 0) {
    p.set("categories", opts.categoryIds.join(","));
  }
  if (opts.priceMin != null) p.set("price_min", String(opts.priceMin));
  if (opts.priceMax != null) p.set("price_max", String(opts.priceMax));
  if (opts.sort && opts.sort !== "newest") p.set("sort", opts.sort);
  if (opts.q) p.set("q", opts.q);
  const qs = p.toString();
  return qs ? `/products?${qs}` : "/products";
}

function parsePriceInput(raw: string): number | null {
  const s = raw.trim().replace(/\./g, "").replace(",", "");
  if (!s) return null;
  const n = Math.floor(Number(s));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(n, 999_999_999);
}

export function ProductsListingControls({
  lockedCategoryId,
  facets,
  selection,
  sort,
  searchQuery,
}: {
  lockedCategoryId: string | null;
  facets: {
    brands: string[];
    colors: string[];
    sizes: SizeFacetOption[];
    priceMin: number;
    priceMax: number;
    categories: { id: string; name: string }[];
  };
  selection: {
    brands: string[];
    colors: string[];
    sizes: string[];
    categoryIds: string[];
    priceMin: number | null;
    priceMax: number | null;
  };
  sort: string;
  searchQuery: string;
}) {
  const router = useRouter();
  const baseId = useId();
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [draftBrands, setDraftBrands] = useState<Set<string>>(
    () => new Set(selection.brands),
  );
  const [draftColors, setDraftColors] = useState<Set<string>>(
    () => new Set(selection.colors),
  );
  const [draftSizes, setDraftSizes] = useState<Set<string>>(
    () => new Set(selection.sizes),
  );
  const [draftCategories, setDraftCategories] = useState<Set<string>>(
    () => new Set(selection.categoryIds),
  );
  const [draftPriceMin, setDraftPriceMin] = useState(() =>
    selection.priceMin != null ? String(selection.priceMin) : "",
  );
  const [draftPriceMax, setDraftPriceMax] = useState(() =>
    selection.priceMax != null ? String(selection.priceMax) : "",
  );

  const sortPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftBrands(new Set(selection.brands));
    setDraftColors(new Set(selection.colors));
    setDraftSizes(new Set(selection.sizes));
    setDraftCategories(new Set(selection.categoryIds));
    setDraftPriceMin(selection.priceMin != null ? String(selection.priceMin) : "");
    setDraftPriceMax(selection.priceMax != null ? String(selection.priceMax) : "");
  }, [selection]);

  const navigate = useCallback(
    (next: {
      brands?: string[];
      colors?: string[];
      sizes?: string[];
      categoryIds?: string[];
      priceMin?: number | null;
      priceMax?: number | null;
      sort?: string;
    }) => {
      router.push(
        buildListingQuery({
          lockedCategoryId,
          brands: next.brands ?? selection.brands,
          colors: next.colors ?? selection.colors,
          sizeKeys: next.sizes ?? selection.sizes,
          categoryIds: next.categoryIds ?? selection.categoryIds,
          priceMin:
            next.priceMin !== undefined ? next.priceMin : selection.priceMin,
          priceMax:
            next.priceMax !== undefined ? next.priceMax : selection.priceMax,
          sort: next.sort ?? sort,
          q: searchQuery,
        }),
      );
      setSortOpen(false);
      setFilterOpen(false);
    },
    [
      lockedCategoryId,
      router,
      searchQuery,
      selection.brands,
      selection.categoryIds,
      selection.colors,
      selection.priceMax,
      selection.priceMin,
      selection.sizes,
      sort,
    ],
  );

  useEffect(() => {
    if (!sortOpen) return;
    function onDoc(e: MouseEvent) {
      if (
        sortPanelRef.current &&
        !sortPanelRef.current.contains(e.target as Node)
      ) {
        setSortOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [sortOpen]);

  useEffect(() => {
    if (!filterOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [filterOpen]);

  useEffect(() => {
    if (!filterOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFilterOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [filterOpen]);

  const sortLabel =
    SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Destacados";

  const showCategorySection =
    !lockedCategoryId && facets.categories.length > 0;
  const showPriceSection = facets.priceMax > 0;

  function toggleSet(
    setter: Dispatch<SetStateAction<Set<string>>>,
    key: string,
  ) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function applyFilters() {
    let pMin = parsePriceInput(draftPriceMin);
    let pMax = parsePriceInput(draftPriceMax);
    if (pMin != null && pMax != null && pMin > pMax) {
      const t = pMin;
      pMin = pMax;
      pMax = t;
    }
    navigate({
      brands: [...draftBrands],
      colors: [...draftColors],
      sizes: [...draftSizes],
      categoryIds: [...draftCategories],
      priceMin: pMin,
      priceMax: pMax,
    });
  }

  function clearFilters() {
    setDraftBrands(new Set());
    setDraftColors(new Set());
    setDraftSizes(new Set());
    setDraftCategories(new Set());
    setDraftPriceMin("");
    setDraftPriceMax("");
    navigate({
      brands: [],
      colors: [],
      sizes: [],
      categoryIds: [],
      priceMin: null,
      priceMax: null,
    });
  }

  function chipClass(active: boolean) {
    return `flex min-h-[2.5rem] cursor-pointer items-center justify-center gap-2 rounded border px-2 py-2 text-center text-[11px] font-medium uppercase leading-tight tracking-wide transition sm:text-[12px] ${
      active
        ? "border-stone-900 bg-stone-900 text-white"
        : "border-stone-200 text-stone-800 hover:border-stone-400"
    }`;
  }

  const sectionTitle =
    "text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500";

  return (
    <>
      <div className="flex items-center justify-end gap-0 px-2 py-3 sm:px-4">
        <div className="flex items-center gap-1 text-[11px] font-semibold tracking-[0.18em] text-stone-800 sm:text-xs sm:tracking-[0.2em]">
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="border-0 bg-transparent px-2 py-1.5 uppercase shadow-none outline-none transition-colors hover:bg-transparent hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400/35 focus-visible:ring-offset-0"
          >
            Filtrar
          </button>
          <span className="text-stone-300 uppercase" aria-hidden>
            {" | "}
          </span>
          <div className="relative" ref={sortPanelRef}>
            <button
              type="button"
              id={`${baseId}-sort-trigger`}
              aria-expanded={sortOpen}
              aria-haspopup="listbox"
              onClick={() => setSortOpen((v) => !v)}
              className="border-0 bg-transparent px-2 py-1.5 uppercase shadow-none outline-none transition-colors hover:bg-transparent hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400/35 focus-visible:ring-offset-0"
            >
              Ordenar
            </button>
            {sortOpen ? (
              <ul
                role="listbox"
                aria-labelledby={`${baseId}-sort-trigger`}
                className="absolute right-0 z-50 mt-1 min-w-[12rem] rounded-md border border-stone-200 bg-white py-1 shadow-lg"
              >
                {SORT_OPTIONS.map((opt) => (
                  <li key={opt.value} role="none">
                    <button
                      type="button"
                      role="option"
                      aria-selected={sort === opt.value}
                      onClick={() => navigate({ sort: opt.value })}
                      className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-normal tracking-normal normal-case text-stone-800 transition hover:bg-stone-50 ${
                        sort === opt.value ? "bg-stone-50 font-medium" : ""
                      }`}
                    >
                      {sort === opt.value ? (
                        <span className="text-stone-900">✓</span>
                      ) : (
                        <span className="w-[1em]" aria-hidden />
                      )}
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-[85] flex justify-end transition-[visibility] duration-300 ${
          filterOpen ? "visible" : "invisible pointer-events-none"
        }`}
        aria-hidden={!filterOpen}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
            filterOpen ? "opacity-100" : "opacity-0"
          }`}
          aria-label="Cerrar filtros"
          onClick={() => setFilterOpen(false)}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${baseId}-filter-title`}
          className={`relative flex h-full w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300 ease-out ${
            filterOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-stone-200 px-4 py-4">
            <h2
              id={`${baseId}-filter-title`}
              className="text-[13px] font-semibold uppercase tracking-[0.14em] text-stone-900"
            >
              Filtrar
            </h2>
            <button
              type="button"
              onClick={() => setFilterOpen(false)}
              className="inline-flex size-10 items-center justify-center border border-dashed border-stone-400 text-stone-700 transition hover:bg-stone-50 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400/50"
              aria-label="Cerrar filtros"
            >
              <X className="size-5" strokeWidth={1.25} aria-hidden />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
            {showCategorySection ? (
              <section className="border-b border-stone-100 pb-8">
                <p className={sectionTitle}>Categoría</p>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {facets.categories.map((c) => {
                    const checked = draftCategories.has(c.id);
                    return (
                      <label key={c.id} className={chipClass(checked)}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            toggleSet(setDraftCategories, c.id)
                          }
                          className="sr-only"
                        />
                        <span className="line-clamp-3">{c.name}</span>
                      </label>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {showPriceSection ? (
              <section
                className={`pb-8 ${showCategorySection ? "mt-8 border-b border-stone-100" : "border-b border-stone-100"}`}
              >
                <p className={sectionTitle}>Precio (COP)</p>
                <p className="mt-2 text-xs text-stone-500">
                  En esta vista hay productos entre{" "}
                  <span className="tabular-nums font-medium text-stone-700">
                    {facets.priceMin.toLocaleString("es-CO")}
                  </span>{" "}
                  y{" "}
                  <span className="tabular-nums font-medium text-stone-700">
                    {facets.priceMax.toLocaleString("es-CO")}
                  </span>
                  .
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor={`${baseId}-pmin`}
                      className="text-[10px] font-semibold uppercase tracking-wide text-stone-500"
                    >
                      Mínimo
                    </label>
                    <input
                      id={`${baseId}-pmin`}
                      type="text"
                      inputMode="numeric"
                      placeholder={String(facets.priceMin)}
                      value={draftPriceMin}
                      onChange={(e) => setDraftPriceMin(e.target.value)}
                      className="mt-1 w-full rounded border border-stone-200 px-2 py-2 text-sm tabular-nums text-stone-900 outline-none focus:border-stone-400"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`${baseId}-pmax`}
                      className="text-[10px] font-semibold uppercase tracking-wide text-stone-500"
                    >
                      Máximo
                    </label>
                    <input
                      id={`${baseId}-pmax`}
                      type="text"
                      inputMode="numeric"
                      placeholder={String(facets.priceMax)}
                      value={draftPriceMax}
                      onChange={(e) => setDraftPriceMax(e.target.value)}
                      className="mt-1 w-full rounded border border-stone-200 px-2 py-2 text-sm tabular-nums text-stone-900 outline-none focus:border-stone-400"
                    />
                  </div>
                </div>
              </section>
            ) : null}

            {facets.brands.length > 0 ? (
              <section
                className={`pb-8 ${showPriceSection || showCategorySection ? "mt-8 border-b border-stone-100" : "border-b border-stone-100"}`}
              >
                <p className={sectionTitle}>Marca</p>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {facets.brands.map((b) => {
                    const checked = draftBrands.has(b);
                    return (
                      <label key={b} className={chipClass(checked)}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSet(setDraftBrands, b)}
                          className="sr-only"
                        />
                        <span className="line-clamp-2">{b}</span>
                      </label>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {facets.colors.length > 0 ? (
              <section
                className={`pb-8 ${facets.brands.length || showPriceSection || showCategorySection ? "mt-8 border-b border-stone-100" : "border-b border-stone-100"}`}
              >
                <p className={sectionTitle}>Color</p>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {facets.colors.map((c) => {
                    const checked = draftColors.has(c);
                    return (
                      <label key={c} className={chipClass(checked)}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSet(setDraftColors, c)}
                          className="sr-only"
                        />
                        <span className="line-clamp-2">{c}</span>
                      </label>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {facets.sizes.length > 0 ? (
              <section
                className={`pb-4 ${facets.colors.length || facets.brands.length || showPriceSection || showCategorySection ? "mt-8" : ""}`}
              >
                <p className={sectionTitle}>Tamaño / presentación</p>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {facets.sizes.map((s) => {
                    const checked = draftSizes.has(s.key);
                    return (
                      <label key={s.key} className={chipClass(checked)}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSet(setDraftSizes, s.key)}
                          className="sr-only"
                        />
                        <span className="line-clamp-2">{s.label}</span>
                      </label>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <p className="mt-8 text-xs leading-relaxed text-stone-500">
              Podés combinar categoría, precio, marca, color y tamaño. Las marcas y
              colores admiten varias opciones a la vez.
            </p>
          </div>

          <div className="shrink-0 border-t border-stone-200 bg-white px-4 py-4">
            <button
              type="button"
              onClick={applyFilters}
              className="w-full bg-stone-900 py-3.5 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-stone-800"
            >
              Aplicar
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 w-full py-2 text-center text-xs text-stone-600 underline decoration-stone-300 underline-offset-4 hover:text-stone-900"
            >
              Limpiar filtros
            </button>
            <Link
              href={
                lockedCategoryId
                  ? `/products?category=${encodeURIComponent(lockedCategoryId)}`
                  : "/products"
              }
              className="mt-4 block text-center text-[11px] text-stone-500 hover:text-stone-800"
              onClick={() => setFilterOpen(false)}
            >
              {lockedCategoryId
                ? "Ver todos en esta categoría"
                : "Ver todo el catálogo"}
            </Link>
          </div>
        </aside>
      </div>

      <span className="sr-only">Orden actual: {sortLabel}</span>
    </>
  );
}
