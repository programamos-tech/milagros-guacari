import { NextResponse } from "next/server";
import {
  getCart,
  isCartKitLine,
  isCartProductLine,
  normalizeCartForCheckout,
} from "@/lib/cart";
import { imagePathForProductLine } from "@/lib/product-line-image";
import { fetchKitsByIdsWithItems } from "@/lib/load-product-kits";
import {
  kitIsAvailable,
  maxKitsAvailableFromItems,
  resolveKitSalePriceCents,
} from "@/lib/product-kits";
import {
  storefrontListGrossUnitCents,
  storefrontPayableUnitGrossCents,
} from "@/lib/storefront-gross-price";
import {
  CART_DRAWER_UPSELL_LIMIT,
  loadStoreCartUpsells,
  type StoreCartUpsellProduct,
} from "@/lib/store-cart-upsells";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export type CartDrawerItem = {
  productId?: string;
  kitId?: string;
  quantity: number;
  fragrance: string | null;
  name: string;
  priceCents: number;
  listPriceCents?: number | null;
  imagePath: string | null;
  firstColor: string | null;
  lineTotalCents: number;
  listLineTotalCents?: number | null;
  maxStock: number;
};

export type CartDrawerSuggestion = StoreCartUpsellProduct;

function firstColorLabel(colors: unknown): string | null {
  if (!Array.isArray(colors) || colors.length === 0) return null;
  const c = colors[0];
  return typeof c === "string" && c.trim() ? c.trim() : null;
}

/**
 * Drawer de bolsa: lectura rápida del cookie + 1 query de productos
 * (y kits solo por id). Sin getUser/mayorista ni normalización doble.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const onlySuggestions = url.searchParams.get("only") === "suggestions";
  const supabase = await createSupabaseServerClient();

  if (onlySuggestions) {
    const exclude = String(url.searchParams.get("exclude") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const suggestions = await loadStoreCartUpsells(
      supabase,
      exclude,
      CART_DRAWER_UPSELL_LIMIT,
    );
    return NextResponse.json({ suggestions });
  }

  // Cookie cruda: evita getStorefrontCartLines (que re-consulta productos + TODOS los kits).
  const rawLines = await getCart();
  const productLinesRaw = rawLines.filter(isCartProductLine);
  const kitLinesRaw = rawLines.filter(isCartKitLine);
  const productIds = [...new Set(productLinesRaw.map((l) => l.productId))];
  const kitIds = [...new Set(kitLinesRaw.map((l) => l.kitId))];

  if (rawLines.length === 0) {
    return NextResponse.json({
      lines: [],
      items: [] as CartDrawerItem[],
      subtotalCents: 0,
      subtotalNetCents: 0,
      subtotalVatCents: 0,
      wholesaleDiscountPercent: 0,
      suggestions: [] as StoreCartUpsellProduct[],
    });
  }

  const [productsRes, kits] = await Promise.all([
    productIds.length > 0
      ? supabase
          .from("products")
          .select(
            "id,name,price_cents,has_vat,image_path,fragrance_option_images,colors,stock_quantity,is_published",
          )
          .in("id", productIds)
      : Promise.resolve({ data: [] as unknown[] }),
    kitIds.length > 0
      ? fetchKitsByIdsWithItems(supabase, kitIds)
      : Promise.resolve([]),
  ]);

  const productRows = (productsRes.data ?? []) as {
    id: string;
    name: string;
    price_cents: number;
    has_vat?: boolean | null;
    image_path: string | null;
    fragrance_option_images: unknown;
    colors: unknown;
    stock_quantity: number | null;
    is_published: boolean | null;
  }[];

  const byId = new Map(productRows.map((p) => [p.id, p]));
  const stockMap = new Map(
    productRows.map((p) => [
      p.id,
      {
        is_published: p.is_published,
        stock_quantity: p.stock_quantity,
      },
    ]),
  );

  const productLines = normalizeCartForCheckout(productLinesRaw, stockMap);

  const items: CartDrawerItem[] = [];
  let subtotalCents = 0;
  let subtotalNetCents = 0;
  let subtotalVatCents = 0;

  // Precio de lista en drawer (mayorista se aplica en checkout).
  const wholesalePct = 0;

  for (const line of productLines) {
    const p = byId.get(line.productId);
    if (!p) continue;
    const listUnitNet = p.price_cents;
    const payableGrossUnit = storefrontPayableUnitGrossCents(
      listUnitNet,
      p.has_vat,
      wholesalePct,
    );
    const listGrossUnit = storefrontListGrossUnitCents(listUnitNet, p.has_vat);
    const lineNetCents = listUnitNet * line.quantity;
    const lineTotalCents = payableGrossUnit * line.quantity;
    subtotalCents += lineTotalCents;
    subtotalNetCents += lineNetCents;
    subtotalVatCents += Math.max(0, lineTotalCents - lineNetCents);
    const frag = line.fragrance?.trim() || null;
    items.push({
      productId: line.productId,
      quantity: line.quantity,
      fragrance: frag,
      name: p.name,
      priceCents: payableGrossUnit,
      listPriceCents: null,
      imagePath: imagePathForProductLine(
        p.image_path,
        p.fragrance_option_images,
        frag ?? undefined,
      ),
      firstColor: firstColorLabel(p.colors),
      lineTotalCents,
      listLineTotalCents: null,
      maxStock: Math.max(0, Math.floor(Number(p.stock_quantity ?? 0))),
    });
  }

  const kitsById = new Map(kits.map((k) => [k.id, k]));
  const normalizedKitLines: { kitId: string; quantity: number }[] = [];
  for (const line of kitLinesRaw) {
    const kit = kitsById.get(line.kitId);
    if (!kit || !kitIsAvailable(kit, "storefront")) continue;
    const maxK = maxKitsAvailableFromItems(kit.items ?? [], "storefront");
    const q = Math.min(line.quantity, maxK);
    if (q <= 0) continue;
    normalizedKitLines.push({ kitId: kit.id, quantity: q });
    const unit = resolveKitSalePriceCents(kit, kit.items ?? [], "storefront");
    const lineTotalCents = unit * q;
    subtotalCents += lineTotalCents;
    subtotalNetCents += lineTotalCents;
    items.push({
      kitId: kit.id,
      quantity: q,
      fragrance: null,
      name: kit.name,
      priceCents: unit,
      imagePath: kit.image_path,
      firstColor: null,
      lineTotalCents,
      maxStock: maxK,
    });
  }

  return NextResponse.json({
    lines: [...productLines, ...normalizedKitLines],
    items,
    subtotalCents,
    subtotalNetCents,
    subtotalVatCents,
    wholesaleDiscountPercent: 0,
    suggestions: [] as StoreCartUpsellProduct[],
  });
}
