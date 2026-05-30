import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeSizeOptionsFromRow } from "@/lib/product-size-options";
import {
  categoryGroupKey,
  pickCanonicalCategoryId,
} from "@/lib/store-category-group";

export type SizeFacetOption = {
  key: string;
  label: string;
  value: number;
  unit: string;
};

export type ListingFacets = {
  brands: string[];
  colors: string[];
  sizes: SizeFacetOption[];
  priceMin: number;
  priceMax: number;
};

/** Categorías fusionadas para checklist en el catálogo completo. */
export function mergeCategoryRowsForFilterMenu(
  rows: { id: string; name: string; sort_order: number }[],
): { id: string; name: string }[] {
  const groups = new Map<string, typeof rows>();
  for (const c of rows) {
    const k = categoryGroupKey(c.name);
    const arr = groups.get(k) ?? [];
    arr.push(c);
    groups.set(k, arr);
  }
  const merged: { id: string; name: string; sort_order: number }[] = [];
  for (const [, arr] of groups) {
    const canonicalId = pickCanonicalCategoryId(arr) ?? arr[0]!.id;
    const winner = arr.find((c) => c.id === canonicalId) ?? arr[0]!;
    const minSort = Math.min(...arr.map((c) => c.sort_order));
    merged.push({
      id: winner.id,
      name: winner.name,
      sort_order: minSort,
    });
  }
  merged.sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      a.name.localeCompare(b.name, "es"),
  );
  return merged.map(({ id, name }) => ({ id, name }));
}

export async function fetchListingFacets(
  supabase: SupabaseClient,
  options: { categoryIds: string[] | null },
): Promise<ListingFacets> {
  const categoryIds = options.categoryIds?.length ? options.categoryIds : null;
  const { data, error } = await supabase.rpc("store_listing_facets_agg", {
    p_category_ids: categoryIds,
  });

  if (!error && data && typeof data === "object") {
    return facetsFromAggregatedPayload(data as Record<string, unknown>);
  }

  if (error) {
    console.error("[listing-facets] store_listing_facets_agg:", error.message);
  }

  return fetchListingFacetsFallback(supabase, options);
}

function facetsFromAggregatedPayload(payload: Record<string, unknown>): ListingFacets {
  const brands = Array.isArray(payload.brands)
    ? (payload.brands as unknown[]).filter((b): b is string => typeof b === "string")
    : [];
  const colors = Array.isArray(payload.colors)
    ? (payload.colors as unknown[]).filter((c): c is string => typeof c === "string")
    : [];

  const sizeSeen = new Set<string>();
  const sizes: SizeFacetOption[] = [];
  const sizeRows = Array.isArray(payload.sizeRows) ? payload.sizeRows : [];
  for (const raw of sizeRows) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const optRows = normalizeSizeOptionsFromRow({
      size_options: row.size_options,
      size_value: row.size_value as number | null,
      size_unit: row.size_unit as string | null,
    });
    for (const opt of optRows) {
      const su = opt.unit.trim().toLowerCase();
      if (!["ml", "l", "g", "kg", "oz", "unidad"].includes(su)) continue;
      const v = Number(Number(opt.value).toFixed(2));
      if (v <= 0) continue;
      const key = `${v}:${su}`;
      if (sizeSeen.has(key)) continue;
      sizeSeen.add(key);
      const numLabel = String(v).replace(/\.0+$/, "");
      sizes.push({
        key,
        label: `${numLabel} ${su}`,
        value: v,
        unit: su,
      });
    }
  }

  brands.sort((a, b) => a.localeCompare(b, "es"));
  colors.sort((a, b) => a.localeCompare(b, "es"));
  sizes.sort((a, b) => a.label.localeCompare(b.label, "es"));

  return {
    brands,
    colors,
    sizes,
    priceMin: Math.max(0, Number(payload.priceMin ?? 0)),
    priceMax: Math.max(0, Number(payload.priceMax ?? 0)),
  };
}

async function fetchListingFacetsFallback(
  supabase: SupabaseClient,
  options: { categoryIds: string[] | null },
): Promise<ListingFacets> {
  let q = supabase
    .from("products")
    .select("brand, colors, size_options, size_value, size_unit, price_cents")
    .eq("is_published", true);
  if (options.categoryIds?.length) {
    q = q.in("category_id", options.categoryIds);
  }
  const { data, error } = await q;
  if (error || !data?.length) {
    return {
      brands: [],
      colors: [],
      sizes: [],
      priceMin: 0,
      priceMax: 0,
    };
  }

  const brandSeen = new Set<string>();
  const brands: string[] = [];
  const colorSeen = new Set<string>();
  const colors: string[] = [];
  const sizeSeen = new Set<string>();
  const sizes: SizeFacetOption[] = [];
  let priceMin = Number.POSITIVE_INFINITY;
  let priceMax = 0;

  for (const row of data) {
    const price = Math.max(0, Math.floor(Number(row.price_cents ?? 0)));
    if (price > 0) {
      priceMin = Math.min(priceMin, price);
      priceMax = Math.max(priceMax, price);
    }

    const b = typeof row.brand === "string" ? row.brand.trim() : "";
    if (b && b.length <= 160) {
      const bk = b.toLowerCase();
      if (!brandSeen.has(bk)) {
        brandSeen.add(bk);
        brands.push(b);
      }
    }

    const arr = Array.isArray(row.colors) ? row.colors : [];
    for (const c of arr) {
      if (typeof c !== "string") continue;
      const t = c.trim();
      if (!t || t.length > 64) continue;
      const ck = t.toLowerCase();
      if (colorSeen.has(ck)) continue;
      colorSeen.add(ck);
      colors.push(t);
    }

    const optRows = normalizeSizeOptionsFromRow({
      size_options: row.size_options,
      size_value: row.size_value,
      size_unit: row.size_unit,
    });
    for (const opt of optRows) {
      const su = opt.unit.trim().toLowerCase();
      if (!["ml", "l", "g", "kg", "oz", "unidad"].includes(su)) continue;
      const v = Number(Number(opt.value).toFixed(2));
      if (v <= 0) continue;
      const key = `${v}:${su}`;
      if (sizeSeen.has(key)) continue;
      sizeSeen.add(key);
      const numLabel = String(v).replace(/\.0+$/, "");
      sizes.push({
        key,
        label: `${numLabel} ${su}`,
        value: v,
        unit: su,
      });
    }
  }

  brands.sort((a, b) => a.localeCompare(b, "es"));
  colors.sort((a, b) => a.localeCompare(b, "es"));
  sizes.sort((a, b) => a.label.localeCompare(b.label, "es"));

  return {
    brands,
    colors,
    sizes,
    priceMin: Number.isFinite(priceMin) ? priceMin : 0,
    priceMax,
  };
}
