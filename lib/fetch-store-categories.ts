import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveCategoryIconKey, type CategoryIconKey } from "@/lib/category-icons";
import {
  categoryGroupKey,
  pickCanonicalCategoryId,
} from "@/lib/store-category-group";
import {
  getStoreCategoryVisual,
  type StoreCategoryVisual,
} from "@/lib/store-category-visuals";

export type StoreCategoryMenuItem = {
  id: string;
  name: string;
  sort_order: number;
  iconKey: CategoryIconKey;
  productCount: number;
} & StoreCategoryVisual;

/**
 * Categorías del catálogo para el menú Tienda (fusiona duplicados y variantes con/sin artículo).
 * Origen: tabla `categories` + conteos por productos publicados.
 * Solo entran filas con al menos un producto publicado en esa categoría (o en un id fusionado del mismo grupo).
 */
export async function fetchStoreCategoriesWithCounts(
  supabase: SupabaseClient,
): Promise<StoreCategoryMenuItem[]> {
  const { data: categories, error: catErr } = await supabase
    .from("categories")
    .select("id,name,sort_order,icon_key")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (catErr || !categories?.length) return [];

  const countByCategory = await fetchPublishedProductCountsByCategory(supabase);

  const groups = new Map<string, typeof categories>();
  for (const c of categories) {
    const k = categoryGroupKey(c.name);
    const arr = groups.get(k) ?? [];
    arr.push(c);
    groups.set(k, arr);
  }

  const out: StoreCategoryMenuItem[] = [];
  let visualIndex = 0;
  for (const [, arr] of groups) {
    const canonicalId = pickCanonicalCategoryId(arr) ?? arr[0]!.id;
    const winner = arr.find((c) => c.id === canonicalId) ?? arr[0]!;
    const minSort = Math.min(...arr.map((c) => c.sort_order));
    let productCount = 0;
    for (const c of arr) {
      productCount += countByCategory.get(c.id) ?? 0;
    }
    if (productCount <= 0) continue;

    const visual = getStoreCategoryVisual(winner.name, visualIndex);
    visualIndex += 1;

    out.push({
      id: canonicalId,
      name: winner.name,
      sort_order: minSort,
      iconKey: resolveCategoryIconKey(winner.icon_key),
      productCount,
      ...visual,
    });
  }

  out.sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      a.name.localeCompare(b.name, "es"),
  );
  return out;
}

async function fetchPublishedProductCountsByCategory(
  supabase: SupabaseClient,
): Promise<Map<string, number>> {
  const { data, error } = await supabase.rpc(
    "store_published_product_counts_by_category",
  );

  if (!error && data?.length) {
    const map = new Map<string, number>();
    for (const row of data as { category_id: string; product_count: number }[]) {
      if (row.category_id) {
        map.set(row.category_id, Number(row.product_count ?? 0));
      }
    }
    return map;
  }

  if (error) {
    console.error(
      "[store-categories] store_published_product_counts_by_category:",
      error.message,
    );
  }

  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("category_id")
    .eq("is_published", true);

  const countByCategory = new Map<string, number>();
  if (!prodErr) {
    for (const row of products ?? []) {
      const cid = row.category_id as string | null;
      if (!cid) continue;
      countByCategory.set(cid, (countByCategory.get(cid) ?? 0) + 1);
    }
  }
  return countByCategory;
}
