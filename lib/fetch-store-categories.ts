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
 * Categorías del catálogo para el menú Shop (fusiona duplicados / sinónimos).
 * Siguen apareciendo aunque no tengan productos publicados.
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

  const groups = new Map<string, typeof categories>();
  for (const c of categories) {
    const k = categoryGroupKey(c.name);
    const arr = groups.get(k) ?? [];
    arr.push(c);
    groups.set(k, arr);
  }

  const merged: StoreCategoryMenuItem[] = [];
  let visualIndex = 0;
  for (const [, arr] of groups) {
    const productCount = arr.reduce(
      (sum, c) => sum + (countByCategory.get(c.id) ?? 0),
      0,
    );

    const canonicalId = pickCanonicalCategoryId(arr) ?? arr[0]!.id;
    const winner = arr.find((c) => c.id === canonicalId) ?? arr[0]!;
    const minSort = Math.min(...arr.map((c) => c.sort_order));

    const visual = getStoreCategoryVisual(winner.name, visualIndex);
    visualIndex += 1;

    merged.push({
      id: canonicalId,
      name: winner.name,
      sort_order: minSort,
      iconKey: resolveCategoryIconKey(winner.icon_key),
      productCount,
      ...visual,
    });
  }

  merged.sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      a.name.localeCompare(b.name, "es"),
  );

  return merged;
}
