import {
  KIT_ITEMS_SELECT,
  type KitComponentRow,
  type ProductKitRow,
} from "@/lib/product-kits";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchKitWithItems(
  supabase: SupabaseClient,
  kitId: string,
): Promise<ProductKitRow | null> {
  const { data: kit } = await supabase
    .from("product_kits")
    .select("*")
    .eq("id", kitId)
    .maybeSingle();
  if (!kit) return null;

  const { data: items } = await supabase
    .from("product_kit_items")
    .select(KIT_ITEMS_SELECT)
    .eq("kit_id", kitId)
    .order("sort_order", { ascending: true });

  return {
    ...(kit as ProductKitRow),
    items: (items ?? []) as unknown as KitComponentRow[],
  };
}

export async function fetchKitsWithItems(
  supabase: SupabaseClient,
  opts?: { publishedOnly?: boolean },
): Promise<ProductKitRow[]> {
  let q = supabase
    .from("product_kits")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (opts?.publishedOnly) {
    q = q.eq("is_published", true);
  }
  const { data: kits } = await q;
  if (!kits?.length) return [];

  const ids = kits.map((k) => k.id as string);
  const { data: items } = await supabase
    .from("product_kit_items")
    .select(`${KIT_ITEMS_SELECT}, kit_id`)
    .in("kit_id", ids)
    .order("sort_order", { ascending: true });

  const byKit = new Map<string, KitComponentRow[]>();
  for (const row of items ?? []) {
    const kid = String((row as { kit_id: string }).kit_id);
    const list = byKit.get(kid) ?? [];
    const { kit_id: _k, ...rest } = row as unknown as KitComponentRow & {
      kit_id: string;
    };
    list.push(rest);
    byKit.set(kid, list);
  }

  return kits.map((k) => ({
    ...(k as ProductKitRow),
    items: byKit.get(k.id as string) ?? [],
  }));
}
