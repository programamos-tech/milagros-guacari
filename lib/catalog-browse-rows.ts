import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeCategoryRowsForFilterMenu } from "@/lib/product-listing-facets";
import { expandCategoryIdsFromRows } from "@/lib/store-category-group";

const PRODUCT_SELECT =
  "id,name,brand,description,price_cents,has_vat,image_path,stock_quantity,size_options,size_value,size_unit,fragrance_options,created_at";

export const CATALOG_ROW_PREVIEW_LIMIT = 12;

export type CatalogBrowseProductRow = {
  id: string;
  name: string;
  brand: string;
  description: string | null;
  price_cents: number;
  has_vat?: boolean | null;
  image_path: string | null;
  stock_quantity: number;
  size_options?: unknown;
  size_value: number | null;
  size_unit: string | null;
  fragrance_options: string[] | null;
};

export type CatalogBrowseSection = {
  categoryId: string | null;
  categoryName: string;
  products: CatalogBrowseProductRow[];
  showSeeAll: boolean;
};

export async function fetchCatalogBrowseSections(
  supabase: SupabaseClient,
  allCategoryRows: { id: string; name: string; sort_order: number }[],
): Promise<CatalogBrowseSection[]> {
  const merged = mergeCategoryRowsForFilterMenu(allCategoryRows);

  const rowsByCategory = await Promise.all(
    merged.map(async (cat) => {
      const expandedIds = expandCategoryIdsFromRows(allCategoryRows, cat.id);
      if (!expandedIds.length) return null;

      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("is_published", true)
        .in("category_id", expandedIds)
        .order("created_at", { ascending: false })
        .limit(CATALOG_ROW_PREVIEW_LIMIT);

      if (error || !data?.length) return null;

      const section: CatalogBrowseSection = {
        categoryId: cat.id,
        categoryName: cat.name,
        products: data as CatalogBrowseProductRow[],
        showSeeAll: true,
      };
      return section;
    }),
  );

  const sections: CatalogBrowseSection[] = [];
  for (const r of rowsByCategory) {
    if (r) sections.push(r);
  }

  const { data: uncategorized, error: orphanErr } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_published", true)
    .is("category_id", null)
    .order("created_at", { ascending: false })
    .limit(CATALOG_ROW_PREVIEW_LIMIT);

  if (!orphanErr && uncategorized?.length) {
    sections.push({
      categoryId: null,
      categoryName: "Sin categoría",
      products: uncategorized as CatalogBrowseProductRow[],
      showSeeAll: false,
    });
  }

  return sections;
}
