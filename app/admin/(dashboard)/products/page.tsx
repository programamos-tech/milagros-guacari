import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminProductsPagination } from "@/components/admin/AdminProductsPagination";
import { CategoriesModal } from "@/components/admin/CategoriesModal";
import { CategoriesPanel } from "@/components/admin/CategoriesPanel";
import { ProductFiltersBar } from "@/components/admin/ProductFiltersBar";
import { ProductTableActions } from "@/components/admin/ProductTableActions";
import {
  adminProductsListHref,
  adminProductsUrlWithoutFlash,
  parseAdminProductsCategoriesModal,
  parseAdminProductsPage,
  parseAdminProductsPerPage,
} from "@/lib/admin-products-url";
import {
  fetchAdminCategoriesList,
  fetchAdminCategoriesManageList,
  fetchAdminProductsList,
} from "@/lib/supabase/admin-products-list";
import { loadAdminPermissions } from "@/lib/load-admin-permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminProductCardClass, adminTableWrapClass } from "@/lib/admin-ui";
import { formatCop } from "@/lib/money";
import { AdminProductsFlashToast } from "@/components/admin/AdminProductsFlashToast";

export const dynamic = "force-dynamic";

const LOW_STOCK_MAX = 4;

/** Mismo padding horizontal en todas las columnas (sin rayas verticales). */
const colGap = "px-4";

const thCell = `bg-white py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400 ${colGap}`;

const tdCell = `py-3.5 align-middle ${colGap}`;

type Search = {
  q?: string;
  status?: string;
  category_id?: string;
  categories?: string;
  category_error?: string;
  error?: string;
  saved?: string;
  uploadError?: string;
  page?: string;
  per_page?: string;
};

function stockBadge(stock: number) {
  if (stock <= 0) {
    return {
      label: "Sin stock",
      className:
        "bg-red-50 text-red-800 ring-red-200/90 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800/50",
    };
  }
  if (stock <= LOW_STOCK_MAX) {
    return {
      label: "Stock bajo",
      className:
        "bg-amber-50 text-amber-900 ring-amber-200/90 dark:bg-amber-950/45 dark:text-amber-100 dark:ring-amber-700/50",
    };
  }
  return {
    label: "Con stock",
    className:
      "bg-emerald-50 text-emerald-900 ring-emerald-200/90 dark:bg-emerald-950/45 dark:text-emerald-100 dark:ring-emerald-700/50",
  };
}

function shortSku(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

type RawAdminProductRow = {
  id: string;
  name: string;
  reference?: string | null;
  price_cents: number;
  stock_quantity: number;
  stock_warehouse: number;
  stock_local: number;
  is_published: boolean;
  categories:
    | { id: string; name: string }
    | { id: string; name: string }[]
    | null;
};

type AdminProductRowModel = {
  id: string;
  name: string;
  price_cents: number;
  stock_local: number;
  stock_warehouse: number;
  stock_quantity: number;
  categoryLabel: string;
  code: string;
  stockBadgeInfo: ReturnType<typeof stockBadge>;
};

function normalizeAdminProductRow(row: unknown): AdminProductRowModel {
  const raw = row as RawAdminProductRow;
  const catRow = Array.isArray(raw.categories)
    ? raw.categories[0] ?? null
    : raw.categories;
  const stockQty = Number(raw.stock_quantity ?? 0);
  return {
    id: raw.id,
    name: raw.name,
    price_cents: raw.price_cents,
    stock_local: Number(raw.stock_local ?? 0),
    stock_warehouse: Number(raw.stock_warehouse ?? 0),
    stock_quantity: stockQty,
    categoryLabel: catRow?.name ?? "—",
    code:
      (raw.reference && String(raw.reference).trim()) || shortSku(raw.id),
    stockBadgeInfo: stockBadge(stockQty),
  };
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const authPerm = await loadAdminPermissions();
  const canCreateProduct = Boolean(authPerm?.permissions.productos_crear);
  const canEditProduct = Boolean(authPerm?.permissions.productos_editar);
  const canStockUpdate = Boolean(authPerm?.permissions.stock_actualizar);
  const canStockTransfer = Boolean(authPerm?.permissions.stock_transferir);
  const canManageCategories = Boolean(authPerm?.permissions.categorias_gestionar);

  const spRecord = sp as Record<string, string | string[] | undefined>;
  const q = (sp.q ?? "").trim();
  const status = (sp.status ?? "all").trim() || "all";
  const categoryId = (sp.category_id ?? "").trim();
  const err = sp.error;
  const flashSaved = sp.saved === "1" || sp.saved === "true";
  const flashUploadError =
    sp.uploadError === "1" || sp.uploadError === "true";
  const cleanProductsHref = adminProductsUrlWithoutFlash(spRecord);

  const currentPage = parseAdminProductsPage(spRecord);
  const pageSize = parseAdminProductsPerPage(spRecord);
  const showCategories = parseAdminProductsCategoriesModal(spRecord);
  const rawCategoryErr =
    typeof sp.category_error === "string" ? sp.category_error : undefined;
  const categoryFormError =
    showCategories && (rawCategoryErr === "name" || rawCategoryErr === "db")
      ? rawCategoryErr
      : undefined;

  const categoriesCloseHref = adminProductsListHref({
    q,
    status,
    category_id: categoryId,
    page: currentPage,
    per_page: pageSize,
  });
  const categoriesOpenHref = adminProductsListHref({
    q,
    status,
    category_id: categoryId,
    page: currentPage,
    per_page: pageSize,
    categories: true,
  });

  if (showCategories && !canManageCategories) {
    redirect(categoriesCloseHref);
  }

  const supabase = await createSupabaseServerClient();

  const [categoryList, listResult, categoriesManage] = await Promise.all([
    fetchAdminCategoriesList(supabase),
    fetchAdminProductsList(supabase, {
      q,
      status,
      categoryId,
      lowStockMax: LOW_STOCK_MAX,
      page: currentPage,
      pageSize,
    }),
    showCategories
      ? fetchAdminCategoriesManageList(supabase)
      : Promise.resolve({ list: [], error: false }),
  ]);

  const {
    list,
    error: queryError,
    usedFallbackSelect,
    totalCount,
  } = listResult;

  const productRows = list.map(normalizeAdminProductRow);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (!queryError && totalCount > 0 && currentPage > totalPages) {
    redirect(
      adminProductsListHref({
        q,
        status,
        category_id: categoryId,
        page: totalPages,
        per_page: pageSize,
        categories: showCategories,
      }),
    );
  }

  return (
    <>
    <div className="min-w-0">
      <div className="flex flex-col gap-4 border-b border-zinc-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            Productos
          </h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-600">
            Gestioná inventario, precios y publicación.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManageCategories ? (
            <Link
              href={categoriesOpenHref}
              scroll={false}
              className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-[0_1px_0_0_rgb(24_24_27/0.04)] transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:shadow-none dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            >
              Categorías
            </Link>
          ) : null}
          <Link
            href="/admin/products"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-[0_1px_0_0_rgb(24_24_27/0.04)] transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:shadow-none dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            title="Quitar filtros y recargar"
          >
            Actualizar
          </Link>
          {canCreateProduct ? (
            <Link
              href="/admin/products/new"
              className="inline-flex items-center justify-center rounded-lg border border-zinc-900 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              + Nuevo producto
            </Link>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 py-6">
        {queryError ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-100">
            No se pudo cargar productos desde Supabase. Revisa{" "}
            <code className="text-xs">NEXT_PUBLIC_SUPABASE_URL</code> y la clave
            anónima, que exista la tabla <code className="text-xs">products</code>{" "}
            y tu usuario admin en <code className="text-xs">public.profiles</code>.
            En Supabase → SQL, puedes ejecutar el archivo{" "}
            <code className="text-xs">supabase/full_schema.sql</code> (todas las
            migraciones en orden).
          </p>
        ) : null}

        {!queryError && usedFallbackSelect ? (
          <p className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
            La base está parcialmente migrada: se listan productos con un esquema
            compatible. Ejecuta{" "}
            <code className="text-xs">supabase/full_schema.sql</code> en el SQL
            editor para alinear categorías, stock bodega/local y referencia/costo.
          </p>
        ) : null}

        {err === "stock" ? (
          <p
            className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900 ring-1 ring-red-100"
            role="alert"
          >
            No se pudo actualizar el stock. Intenta de nuevo.
          </p>
        ) : null}

        <ProductFiltersBar
          defaultQ={q}
          defaultStatus={status}
          defaultCategoryId={categoryId}
          defaultPerPage={pageSize}
          lowStockMax={LOW_STOCK_MAX}
          categories={categoryList}
          categoriesModalOpen={showCategories}
        />
      </div>

      {!queryError && totalCount === 0 ? (
        <div className="border-t border-zinc-100 py-12 text-center">
          <p className="text-sm text-zinc-600">No hay productos con estos criterios.</p>
          {canCreateProduct ? (
            <Link
              href="/admin/products/new"
              className="mt-4 inline-block text-sm font-semibold text-zinc-900 underline decoration-zinc-300 dark:text-zinc-100 dark:decoration-zinc-600"
            >
              Crear el primero
            </Link>
          ) : null}
        </div>
      ) : !queryError ? (
        <>
        {/* Con sidebar, por debajo de xl el área útil suele ser estrecha: rejilla 1/2 cols (como Ventas). Tabla desde xl. */}
        <ul
          role="list"
          className="grid grid-cols-1 gap-4 border-t border-zinc-100 pb-2 pt-4 sm:grid-cols-2 sm:gap-4 xl:hidden"
        >
          {productRows.map((p) => (
            <li key={p.id} className="min-w-0">
              <article className={adminProductCardClass}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="line-clamp-2 font-semibold leading-snug text-zinc-900 hover:underline dark:text-zinc-100"
                    >
                      {p.name}
                    </Link>
                    <p
                      className="mt-1 line-clamp-1 font-mono text-xs text-zinc-500 dark:text-zinc-400"
                      title={p.code}
                    >
                      {p.code}
                    </p>
                  </div>
                  <ProductTableActions
                    productId={p.id}
                    canEdit={canEditProduct}
                    canStock={canStockUpdate}
                    canTransfer={canStockTransfer}
                  />
                </div>
                <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
                  {p.categoryLabel}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-zinc-400 dark:text-zinc-500">Local</span>
                    <p className="tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
                      {p.stock_local}
                    </p>
                  </div>
                  <div>
                    <span className="text-zinc-400 dark:text-zinc-500">Bodega</span>
                    <p className="tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
                      {p.stock_warehouse}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${p.stockBadgeInfo.className}`}
                  >
                    {p.stockBadgeInfo.label}
                  </span>
                </div>
                <p className="mt-auto pt-4 text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {formatCop(p.price_cents)}
                </p>
              </article>
            </li>
          ))}
        </ul>

        <div className="hidden overflow-x-auto border-t border-zinc-100 dark:border-zinc-800 xl:block">
          <div className={adminTableWrapClass}>
            <table className="w-full min-w-0 table-fixed border-collapse text-left text-sm xl:min-w-[1120px]">
              <colgroup>
                <col style={{ width: "25%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "5%" }} />
                <col style={{ width: "5%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "16%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                  <th className={thCell}>Producto</th>
                  <th className={thCell}>Código</th>
                  <th className={thCell}>Categoría</th>
                  <th className={`${thCell} whitespace-nowrap text-right`}>
                    Local
                  </th>
                  <th className={`${thCell} whitespace-nowrap text-right`}>
                    Bodega
                  </th>
                  <th className={`${thCell} whitespace-nowrap`}>Estado</th>
                  <th className={`${thCell} whitespace-nowrap text-right`}>
                    Precio
                  </th>
                  <th className={`${thCell} whitespace-nowrap text-right`}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
                {productRows.map((p) => (
                  <tr
                    key={p.id}
                    className="bg-white transition-colors hover:bg-zinc-50/80 dark:bg-zinc-900 dark:hover:bg-zinc-800/80"
                  >
                    <td className={tdCell}>
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                          <Link
                            href={`/admin/products/${p.id}`}
                            className="hover:underline"
                          >
                            {p.name}
                          </Link>
                        </p>
                      </div>
                    </td>
                    <td className={`${tdCell} align-top`}>
                      <div
                        className="min-w-0 truncate font-mono text-xs leading-snug text-zinc-600 dark:text-zinc-400"
                        title={p.code}
                      >
                        {p.code}
                      </div>
                    </td>
                    <td className={`${tdCell} min-w-0 text-zinc-600 dark:text-zinc-400`}>
                      {p.categoryLabel}
                    </td>
                    <td
                      className={`${tdCell} whitespace-nowrap text-right tabular-nums text-zinc-800 dark:text-zinc-200`}
                    >
                      {p.stock_local}
                    </td>
                    <td
                      className={`${tdCell} whitespace-nowrap text-right tabular-nums text-zinc-800 dark:text-zinc-200`}
                    >
                      {p.stock_warehouse}
                    </td>
                    <td className={`${tdCell} whitespace-nowrap`}>
                      <span
                        className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-medium ring-1 ${p.stockBadgeInfo.className}`}
                      >
                        {p.stockBadgeInfo.label}
                      </span>
                    </td>
                    <td className={`${tdCell} text-right`}>
                      <span className="inline-block whitespace-nowrap text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                        {formatCop(p.price_cents)}
                      </span>
                    </td>
                    <td className={tdCell}>
                      <div className="flex justify-end">
                        <ProductTableActions
                    productId={p.id}
                    canEdit={canEditProduct}
                    canStock={canStockUpdate}
                    canTransfer={canStockTransfer}
                  />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <AdminProductsPagination
          page={currentPage}
          pageSize={pageSize}
          totalCount={totalCount}
          filters={{
            q,
            status,
            category_id: categoryId,
            categories: showCategories,
          }}
        />
        </>
      ) : null}
    </div>
    {flashSaved || flashUploadError ? (
      <AdminProductsFlashToast
        saved={flashSaved}
        uploadError={flashUploadError}
        cleanHref={cleanProductsHref}
      />
    ) : null}

    {showCategories ? (
      <CategoriesModal closeHref={categoriesCloseHref}>
        <CategoriesPanel
          list={categoriesManage.list}
          loadError={categoriesManage.error}
          categoryError={categoryFormError}
        />
      </CategoriesModal>
    ) : null}
    </>
  );
}
