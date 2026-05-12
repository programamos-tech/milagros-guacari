import type { SupabaseClient } from "@supabase/supabase-js";

type ListOpts = {
  q: string;
  status: string;
  categoryId: string;
  lowStockMax: number;
  /** 1-based */
  page: number;
  pageSize: number;
};

function isRetriableSelectError(err: { message?: string; code?: string } | null) {
  const m = err?.message ?? "";
  return (
    m.includes("schema cache") ||
    m.includes("Could not find") ||
    m.includes("Could not find a relationship") ||
    /column .* does not exist/i.test(m) ||
    (/column/i.test(m) && /reference|cost_cents|category_id|stock_warehouse|stock_local|categories|has_vat|vat_percent/i.test(m))
  );
}

/** Select strings from richest schema → minimal (init-only). */
const PRODUCT_SELECT_ATTEMPTS = [
  "id,name,reference,price_cents,has_vat,vat_percent,stock_quantity,stock_warehouse,stock_local,is_published,image_path,created_at,category_id,categories(id,name)",
  "id,name,reference,price_cents,has_vat,vat_percent,stock_quantity,stock_warehouse,stock_local,is_published,image_path,created_at,category_id",
  "id,name,price_cents,has_vat,vat_percent,stock_quantity,stock_warehouse,stock_local,is_published,image_path,created_at,category_id,categories(id,name)",
  "id,name,price_cents,has_vat,vat_percent,stock_quantity,stock_warehouse,stock_local,is_published,image_path,created_at,category_id",
  "id,name,reference,price_cents,has_vat,vat_percent,stock_quantity,is_published,image_path,created_at,category_id,categories(id,name)",
  "id,name,price_cents,has_vat,vat_percent,stock_quantity,is_published,image_path,created_at,category_id,categories(id,name)",
  "id,name,price_cents,has_vat,vat_percent,stock_quantity,is_published,image_path,created_at,category_id",
  "id,name,price_cents,has_vat,vat_percent,stock_quantity,is_published,image_path,created_at",
] as const;

export async function fetchAdminProductsList(
  supabase: SupabaseClient,
  opts: ListOpts,
): Promise<{
  list: unknown[];
  error: { message?: string; code?: string } | null;
  usedFallbackSelect: boolean;
  totalCount: number;
}> {
  const { q, status, categoryId, lowStockMax, page, pageSize } = opts;
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.min(100, Math.max(10, Math.floor(pageSize)));
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;

  for (let i = 0; i < PRODUCT_SELECT_ATTEMPTS.length; i++) {
    const sel = PRODUCT_SELECT_ATTEMPTS[i]!;
    if (categoryId && !sel.includes("category_id")) {
      continue;
    }

    let query = supabase
      .from("products")
      .select(sel, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (q) {
      query = query.ilike("name", `%${q}%`);
    }
    if (categoryId && sel.includes("category_id")) {
      query = query.eq("category_id", categoryId);
    }
    switch (status) {
      case "active":
        query = query.eq("is_published", true);
        break;
      case "draft":
        query = query.eq("is_published", false);
        break;
      case "low":
        query = query.gt("stock_quantity", 0).lte("stock_quantity", lowStockMax);
        break;
      case "out":
        query = query.eq("stock_quantity", 0);
        break;
      default:
        break;
    }

    const { data, error, count } = await query;

    if (!error) {
      return {
        list: data ?? [],
        error: null,
        usedFallbackSelect: i > 0,
        totalCount: count ?? 0,
      };
    }

    if (!isRetriableSelectError(error)) {
      return {
        list: [],
        error,
        usedFallbackSelect: false,
        totalCount: 0,
      };
    }
  }

  return {
    list: [],
    error: { message: "No compatible product schema found" },
    usedFallbackSelect: false,
    totalCount: 0,
  };
}

export async function fetchAdminCategoriesList(supabase: SupabaseClient): Promise<
  { id: string; name: string }[]
> {
  const { data, error } = await supabase
    .from("categories")
    .select("id,name")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return [];
  }
  return data ?? [];
}

export type AdminCategoryManageRow = {
  id: string;
  name: string;
  icon_key: string | null;
  listing_hero_image_path: string | null;
  listing_hero_alt_text: string | null;
};

/** Listado completo para la vista/modal de gestión de categorías (orden en BD por sort_order + nombre). */
export async function fetchAdminCategoriesManageList(supabase: SupabaseClient): Promise<{
  list: AdminCategoryManageRow[];
  error: boolean;
}> {
  const { data, error } = await supabase
    .from("categories")
    .select("id,name,icon_key,listing_hero_image_path,listing_hero_alt_text")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return {
    list: (data ?? []) as AdminCategoryManageRow[],
    error: !!error,
  };
}
