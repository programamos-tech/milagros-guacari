import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeCategoryRowsForFilterMenu } from "@/lib/product-listing-facets";
import { expandCategoryIdsFromRows } from "@/lib/store-category-group";
import { withStorefrontImage } from "@/lib/storefront-product-image";

const PRODUCT_SELECT =
  "id,name,brand,price_cents,has_vat,image_path,stock_quantity,size_options,size_value,size_unit,fragrance_options,created_at";

/** Vista previa por categoría en carrusel horizontal. */
export const CATALOG_ROW_PREVIEW_LIMIT = 8;

export type CatalogBrowseProductRow = {
  id: string;
  name: string;
  brand: string;
  description?: string | null;
  price_cents: number;
  has_vat?: boolean | null;
  image_path: string | null;
  stock_quantity: number;
  size_options?: unknown;
  size_value: number | null;
  size_unit: string | null;
  fragrance_options: string[] | null;
  created_at?: string;
};

export type CatalogBrowseSection = {
  categoryId: string | null;
  categoryName: string;
  products: CatalogBrowseProductRow[];
  showSeeAll: boolean;
  /** `grid` = grilla vertical; `row` = carrusel por categoría. */
  layout?: "row" | "grid";
};

type BrowsePreviewRow = CatalogBrowseProductRow & {
  category_id: string | null;
  created_at: string;
};

function sortByCreatedDesc(
  a: CatalogBrowseProductRow & { created_at?: string },
  b: CatalogBrowseProductRow & { created_at?: string },
) {
  const ta = a.created_at ? Date.parse(a.created_at) : 0;
  const tb = b.created_at ? Date.parse(b.created_at) : 0;
  return tb - ta;
}

function toProductRow(row: BrowsePreviewRow): CatalogBrowseProductRow {
  const {
    category_id: _categoryId,
    created_at: _createdAt,
    ...product
  } = row;
  return product;
}

async function fetchCatalogBrowsePreviewRows(
  supabase: SupabaseClient,
): Promise<BrowsePreviewRow[]> {
  const { data, error } = await supabase.rpc("store_catalog_browse_preview", {
    p_per_category: CATALOG_ROW_PREVIEW_LIMIT + 1,
  });

  if (!error && data?.length) {
    return data as BrowsePreviewRow[];
  }

  if (error) {
    console.error("[catalog-browse] store_catalog_browse_preview:", error.message);
  }

  return fetchCatalogBrowsePreviewRowsFallback(supabase);
}

/** Fallback si la migración RPC aún no está aplicada. */
async function fetchCatalogBrowsePreviewRowsFallback(
  supabase: SupabaseClient,
): Promise<BrowsePreviewRow[]> {
  const merged = await supabase
    .from("categories")
    .select("id,name,sort_order")
    .order("sort_order", { ascending: true });

  const categories = merged.data ?? [];
  if (!categories.length) return [];

  const rows: BrowsePreviewRow[] = [];
  for (const cat of categories) {
    const { data } = await withStorefrontImage(
      supabase
        .from("products")
        .select(`${PRODUCT_SELECT},category_id,created_at`)
        .eq("is_published", true)
        .eq("category_id", cat.id),
    )
      .order("created_at", { ascending: false })
      .limit(CATALOG_ROW_PREVIEW_LIMIT + 1);
    if (data?.length) rows.push(...(data as BrowsePreviewRow[]));
  }

  const { data: uncategorized } = await withStorefrontImage(
    supabase
      .from("products")
      .select(`${PRODUCT_SELECT},category_id,created_at`)
      .eq("is_published", true)
      .is("category_id", null),
  )
    .order("created_at", { ascending: false })
    .limit(CATALOG_ROW_PREVIEW_LIMIT + 1);

  if (uncategorized?.length) rows.push(...(uncategorized as BrowsePreviewRow[]));
  return rows;
}

export async function fetchCatalogBrowseSections(
  supabase: SupabaseClient,
  allCategoryRows: { id: string; name: string; sort_order: number }[],
): Promise<CatalogBrowseSection[]> {
  const previewRows = await fetchCatalogBrowsePreviewRows(supabase);
  const merged = mergeCategoryRowsForFilterMenu(allCategoryRows);
  const byCategoryId = new Map<string, BrowsePreviewRow[]>();

  for (const row of previewRows) {
    const cid = row.category_id;
    if (!cid) continue;
    const bucket = byCategoryId.get(cid) ?? [];
    bucket.push(row);
    byCategoryId.set(cid, bucket);
  }

  const sections: CatalogBrowseSection[] = [];

  for (const cat of merged) {
    const expandedIds = expandCategoryIdsFromRows(allCategoryRows, cat.id);
    if (!expandedIds.length) continue;

    const products: BrowsePreviewRow[] = [];
    for (const id of expandedIds) {
      const bucket = byCategoryId.get(id);
      if (bucket?.length) products.push(...bucket);
    }
    if (!products.length) continue;

    products.sort(sortByCreatedDesc);
    const slice = products.slice(0, CATALOG_ROW_PREVIEW_LIMIT);
    const showSeeAll = products.length > CATALOG_ROW_PREVIEW_LIMIT;

    sections.push({
      categoryId: cat.id,
      categoryName: cat.name,
      products: slice.map(toProductRow),
      showSeeAll,
      layout: "row",
    });
  }

  const uncategorized = previewRows
    .filter((row) => row.category_id == null)
    .sort(sortByCreatedDesc);

  if (uncategorized.length) {
    sections.push({
      categoryId: null,
      categoryName: "Otros productos",
      products: uncategorized
        .slice(0, CATALOG_ROW_PREVIEW_LIMIT)
        .map(toProductRow),
      showSeeAll: uncategorized.length > CATALOG_ROW_PREVIEW_LIMIT,
      layout: "grid",
    });
  }

  return sections;
}
