import { expandFragranceLabels } from "@/lib/fragrance-options";
import { storefrontListGrossUnitCents } from "@/lib/storefront-gross-price";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StoreCartUpsellProduct = {
  id: string;
  name: string;
  priceCents: number;
  imagePath: string | null;
  colors: string[];
  /** Fragancias / tonos disponibles para el selector. */
  variantOptions: string[];
  /** Se puede agregar con un clic (sin elegir fragancia). */
  canQuickAdd: boolean;
};

export const CART_DRAWER_UPSELL_LIMIT = 8;
export const CHECKOUT_UPSELL_LIMIT = 6;
export const CHECKOUT_PAYMENT_UPSELL_LIMIT = 4;

function normalizedColorList(colors: unknown): string[] {
  if (!Array.isArray(colors)) return [];
  return colors.filter(
    (c): c is string => typeof c === "string" && c.trim().length > 0,
  );
}

export async function loadStoreCartUpsells(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  excludeIds: string[],
  limit = CHECKOUT_UPSELL_LIMIT,
): Promise<StoreCartUpsellProduct[]> {
  const exclude = new Set(excludeIds);
  const fetchLimit = Math.min(
    64,
    Math.max(32, limit + exclude.size + 12),
  );

  const { data } = await supabase
    .from("products")
    .select(
      "id,name,price_cents,has_vat,image_path,colors,stock_quantity,created_at,fragrance_options",
    )
    .eq("is_published", true)
    .gt("stock_quantity", 0)
    .order("created_at", { ascending: false })
    .limit(fetchLimit);

  return (data ?? [])
    .filter((row) => !exclude.has(row.id))
    .slice(0, limit)
    .map((p) => {
      const rawFragrance = Array.isArray(p.fragrance_options)
        ? p.fragrance_options.filter(
            (x): x is string => typeof x === "string" && x.trim().length > 0,
          )
        : [];
      const variantOptions = expandFragranceLabels(rawFragrance);
      return {
        id: p.id,
        name: p.name,
        priceCents: storefrontListGrossUnitCents(
          p.price_cents,
          (p as { has_vat?: boolean | null }).has_vat,
        ),
        imagePath: p.image_path,
        colors: normalizedColorList(p.colors),
        variantOptions,
        canQuickAdd: variantOptions.length <= 1,
      };
    });
}
