import type { SupabaseClient } from "@supabase/supabase-js";

export type StoreBannerPlacement = "hero" | "products";

export type StoreBannerRow = {
  id: string;
  placement: StoreBannerPlacement;
  image_path: string;
  href: string | null;
  alt_text: string | null;
  sort_order: number;
  is_published: boolean;
};

export async function fetchPublishedBanners(
  supabase: SupabaseClient,
  placement: StoreBannerPlacement,
): Promise<StoreBannerRow[]> {
  const { data, error } = await supabase
    .from("store_banners")
    .select("id,placement,image_path,href,alt_text,sort_order,is_published")
    .eq("placement", placement)
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return [];
  return (data ?? []) as StoreBannerRow[];
}

export async function fetchAllBannersAdmin(
  supabase: SupabaseClient,
): Promise<StoreBannerRow[]> {
  const { data, error } = await supabase
    .from("store_banners")
    .select("id,placement,image_path,href,alt_text,sort_order,is_published")
    .order("placement", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return [];
  return (data ?? []) as StoreBannerRow[];
}
