import { NextResponse } from "next/server";
import { imagePathForProductLine } from "@/lib/product-line-image";
import { getStorefrontCartLines } from "@/lib/storefront-cart";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export type CartDrawerItem = {
  productId: string;
  quantity: number;
  fragrance: string | null;
  name: string;
  priceCents: number;
  imagePath: string | null;
  firstColor: string | null;
  lineTotalCents: number;
  maxStock: number;
};

export type CartDrawerSuggestion = {
  id: string;
  name: string;
  priceCents: number;
  imagePath: string | null;
  colors: string[];
};

const SUGGESTION_LIMIT = 8;

function normalizedColorList(colors: unknown): string[] {
  if (!Array.isArray(colors)) return [];
  return colors.filter((c): c is string => typeof c === "string" && c.trim().length > 0);
}

async function loadCartDrawerSuggestions(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  excludeIds: string[],
): Promise<CartDrawerSuggestion[]> {
  const exclude = new Set(excludeIds);
  const { data } = await supabase
    .from("products")
    .select("id,name,price_cents,image_path,colors,stock_quantity,created_at")
    .eq("is_published", true)
    .gt("stock_quantity", 0)
    .order("created_at", { ascending: false })
    .limit(Math.min(64, Math.max(32, SUGGESTION_LIMIT + exclude.size + 12)));

  return (data ?? [])
    .filter((row) => !exclude.has(row.id))
    .slice(0, SUGGESTION_LIMIT)
    .map((p) => ({
      id: p.id,
      name: p.name,
      priceCents: p.price_cents,
      imagePath: p.image_path,
      colors: normalizedColorList(p.colors),
    }));
}

function firstColorLabel(colors: unknown): string | null {
  if (!Array.isArray(colors) || colors.length === 0) return null;
  const c = colors[0];
  return typeof c === "string" && c.trim() ? c.trim() : null;
}

/** Líneas del carrito + ítems enriquecidos para el drawer (y `lines` compat). */
export async function GET() {
  const lines = await getStorefrontCartLines();
  const supabase = await createSupabaseServerClient();

  if (lines.length === 0) {
    const empty: CartDrawerItem[] = [];
    const suggestions = await loadCartDrawerSuggestions(supabase, []);
    return NextResponse.json({
      lines: [],
      items: empty,
      subtotalCents: 0,
      suggestions,
    });
  }

  const ids = [...new Set(lines.map((l) => l.productId))];
  const { data: products } = await supabase
    .from("products")
    .select(
      "id,name,price_cents,image_path,fragrance_option_images,colors,stock_quantity",
    )
    .in("id", ids)
    .eq("is_published", true);

  const byId = new Map(
    (products ?? []).map((p) => [
      p.id,
      p as {
        id: string;
        name: string;
        price_cents: number;
        image_path: string | null;
        fragrance_option_images: unknown;
        colors: unknown;
        stock_quantity: number | null;
      },
    ]),
  );

  const items: CartDrawerItem[] = [];
  let subtotalCents = 0;

  for (const line of lines) {
    const p = byId.get(line.productId);
    if (!p) continue;
    const lineTotalCents = p.price_cents * line.quantity;
    subtotalCents += lineTotalCents;
    const frag = line.fragrance?.trim() || null;
    items.push({
      productId: line.productId,
      quantity: line.quantity,
      fragrance: frag,
      name: p.name,
      priceCents: p.price_cents,
      imagePath: imagePathForProductLine(
        p.image_path,
        p.fragrance_option_images,
        frag ?? undefined,
      ),
      firstColor: firstColorLabel(p.colors),
      lineTotalCents,
      maxStock: Math.max(
        0,
        Math.floor(Number(p.stock_quantity ?? 0)),
      ),
    });
  }

  const suggestions = await loadCartDrawerSuggestions(supabase, ids);

  return NextResponse.json({ lines, items, subtotalCents, suggestions });
}
