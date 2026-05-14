"use client";

import { productInputOnWhiteClass } from "@/components/admin/product-form-primitives";

type Category = { id: string; name: string };

type Props = {
  defaultQ: string;
  defaultStatus: string;
  defaultCategoryId: string;
  defaultPerPage: number;
  lowStockMax: number;
  categories: Category[];
  /** Conserva el modal de categorías abierto al aplicar filtros. */
  categoriesModalOpen?: boolean;
};

export function ProductFiltersBar({
  defaultQ,
  defaultStatus,
  defaultCategoryId,
  defaultPerPage,
  lowStockMax,
  categories,
  categoriesModalOpen = false,
}: Props) {
  const labelClass =
    "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600";
  const fieldClass = `${productInputOnWhiteClass} font-medium`;

  return (
    <form
      method="get"
      action="/admin/products"
      className="grid gap-4 sm:grid-cols-12"
    >
      {categoriesModalOpen ? (
        <input type="hidden" name="categories" value="1" />
      ) : null}
      <input type="hidden" name="page" value="1" />
      <input type="hidden" name="per_page" value={String(defaultPerPage)} />
      <div className="sm:col-span-5">
        <label htmlFor="q" className={labelClass}>
          Nombre / código
        </label>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={defaultQ}
            placeholder="Buscar…"
            enterKeyHint="search"
            className={`${fieldClass} min-w-0 flex-1`}
          />
          <button
            type="submit"
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-rose-200/80 bg-rose-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-900 dark:border-rose-400/30 dark:bg-rose-400/15 dark:text-rose-50 dark:hover:bg-rose-400/25"
          >
            Buscar
          </button>
        </div>
      </div>
      <div className="sm:col-span-3">
        <label htmlFor="status" className={labelClass}>
          Estado
        </label>
        <select
          id="status"
          name="status"
          defaultValue={defaultStatus}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className={fieldClass}
        >
          <option value="all">Todos</option>
          <option value="active">Publicados</option>
          <option value="draft">Borradores</option>
          <option value="low">Stock bajo (1–{lowStockMax})</option>
          <option value="out">Sin stock</option>
        </select>
      </div>
      <div className="sm:col-span-4">
        <label htmlFor="category_id" className={labelClass}>
          Categoría
        </label>
        <select
          id="category_id"
          name="category_id"
          defaultValue={defaultCategoryId}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className={fieldClass}
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}
