import type { SupabaseClient } from "@supabase/supabase-js";

/** Marcas distintas entre productos publicados (para filtros del listado). */
export async function fetchPublishedProductBrands(
  supabase: SupabaseClient,
  options: { categoryIds: string[] | null },
): Promise<string[]> {
  let q = supabase.from("products").select("brand").eq("is_published", true);
  if (options.categoryIds?.length) {
    q = q.in("category_id", options.categoryIds);
  }
  const { data, error } = await q;
  if (error || !data?.length) return [];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of data) {
    const b = typeof row.brand === "string" ? row.brand.trim() : "";
    if (!b || b.length > 160) continue;
    const k = b.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(b);
  }
  out.sort((a, b) => a.localeCompare(b, "es"));
  return out;
}
