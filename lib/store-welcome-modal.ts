import type { SupabaseClient } from "@supabase/supabase-js";
import { storeWhatsAppPrefilledText, storeWhatsAppUrl } from "@/lib/brand";

export type StoreWelcomeModalRow = {
  id: string;
  title: string;
  description: string;
  image_path: string | null;
  discount_code: string | null;
  cta_label: string;
  cta_href: string | null;
  is_enabled: boolean;
  sort_order: number;
  created_at: string;
};

function fallbackCtaHref() {
  if (storeWhatsAppUrl === "#") return null;
  return `${storeWhatsAppUrl}?text=${encodeURIComponent(storeWhatsAppPrefilledText)}`;
}

export function resolveWelcomeModalCtaHref(href: string | null | undefined) {
  const raw = href?.trim() ?? "";
  return raw.length > 0 ? raw : fallbackCtaHref();
}

export async function fetchActiveWelcomeModal(
  supabase: SupabaseClient,
): Promise<StoreWelcomeModalRow | null> {
  const { data } = await supabase
    .from("store_welcome_modals")
    .select(
      "id,title,description,image_path,discount_code,cta_label,cta_href,is_enabled,sort_order,created_at",
    )
    .eq("is_enabled", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as StoreWelcomeModalRow | null) ?? null;
}

