import { NextResponse } from "next/server";
import { imagePathForProductLine } from "@/lib/product-line-image";
import {
  unitPriceAfterWholesaleCents,
  wholesaleDiscountPercentFromRow,
} from "@/lib/customer-wholesale-pricing";
import {
  storefrontListGrossUnitCents,
  storefrontPayableUnitGrossCents,
} from "@/lib/storefront-gross-price";
import { isCartKitLine, isCartProductLine } from "@/lib/cart";
import { fetchKitsWithItems } from "@/lib/load-product-kits";
import {
  maxKitsAvailableFromItems,
  resolveKitSalePriceCents,
} from "@/lib/product-kits";
import { getStorefrontCartLines } from "@/lib/storefront-cart";
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
  /** Precio de catálogo por unidad (solo si hay descuento mayorista). */
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

async function loggedStoreCustomerWholesalePercent(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return 0;
  const { data: prof } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (prof) return 0;
  const { data: c } = await supabase
    .from("customers")
    .select("customer_kind, wholesale_discount_percent")
    .maybeSingle();
  return wholesaleDiscountPercentFromRow(
    (c ?? {}) as {
      customer_kind?: string | null;
      wholesale_discount_percent?: number | null;
    },
  );
}

/** Líneas del carrito + ítems enriquecidos para el drawer (y `lines` compat). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const includeSuggestions = url.searchParams.get("suggestions") !== "0";
  const onlySuggestions = url.searchParams.get("only") === "suggestions";

  const lines = await getStorefrontCartLines();
  const supabase = await createSupabaseServerClient();

  const productLines = lines.filter(isCartProductLine);
  const kitLines = lines.filter(isCartKitLine);
  const ids = [...new Set(productLines.map((l) => l.productId))];

  if (onlySuggestions) {
    const suggestions = await loadStoreCartUpsells(
      supabase,
      ids,
      CART_DRAWER_UPSELL_LIMIT,
    );
    return NextResponse.json({ suggestions });
  }

  const [wholesalePct, productsRes, kits, suggestions] = await Promise.all([
    loggedStoreCustomerWholesalePercent(supabase),
    ids.length > 0
      ? supabase
          .from("products")
          .select(
            "id,name,price_cents,has_vat,image_path,fragrance_option_images,colors,stock_quantity",
          )
          .in("id", ids)
          .eq("is_published", true)
      : Promise.resolve({ data: [] as unknown[] }),
    kitLines.length > 0
      ? fetchKitsWithItems(supabase, { publishedOnly: true })
      : Promise.resolve([]),
    includeSuggestions
      ? loadStoreCartUpsells(supabase, ids, CART_DRAWER_UPSELL_LIMIT)
      : Promise.resolve([] as StoreCartUpsellProduct[]),
  ]);

  if (lines.length === 0) {
    return NextResponse.json({
      lines: [],
      items: [] as CartDrawerItem[],
      subtotalCents: 0,
      subtotalNetCents: 0,
      subtotalVatCents: 0,
      wholesaleDiscountPercent: wholesalePct,
      suggestions,
    });
  }

  const byId = new Map(
    ((productsRes.data ?? []) as {
      id: string;
      name: string;
      price_cents: number;
      has_vat?: boolean | null;
      image_path: string | null;
      fragrance_option_images: unknown;
      colors: unknown;
      stock_quantity: number | null;
    }[]).map((p) => [p.id, p]),
  );

  const items: CartDrawerItem[] = [];
  let subtotalCents = 0;
  let subtotalNetCents = 0;
  let subtotalVatCents = 0;

  for (const line of productLines) {
    const p = byId.get(line.productId);
    if (!p) continue;
    const listUnitNet = p.price_cents;
    const netUnit = unitPriceAfterWholesaleCents(listUnitNet, wholesalePct);
    const payableGrossUnit = storefrontPayableUnitGrossCents(
      listUnitNet,
      p.has_vat,
      wholesalePct,
    );
    const listGrossUnit = storefrontListGrossUnitCents(listUnitNet, p.has_vat);
    const lineNetCents = netUnit * line.quantity;
    const lineTotalCents = payableGrossUnit * line.quantity;
    const listLineTotalCents = listGrossUnit * line.quantity;
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
      listPriceCents:
        wholesalePct > 0 && payableGrossUnit < listGrossUnit
          ? listGrossUnit
          : null,
      imagePath: imagePathForProductLine(
        p.image_path,
        p.fragrance_option_images,
        frag ?? undefined,
      ),
      firstColor: firstColorLabel(p.colors),
      lineTotalCents,
      listLineTotalCents:
        wholesalePct > 0 && listLineTotalCents > lineTotalCents
          ? listLineTotalCents
          : null,
      maxStock: Math.max(0, Math.floor(Number(p.stock_quantity ?? 0))),
    });
  }

  if (kitLines.length > 0) {
    const kitsById = new Map(kits.map((k) => [k.id, k]));
    for (const line of kitLines) {
      const kit = kitsById.get(line.kitId);
      if (!kit) continue;
      const kitItems = kit.items ?? [];
      const unit = resolveKitSalePriceCents(kit, kitItems, "storefront");
      const lineTotalCents = unit * line.quantity;
      subtotalCents += lineTotalCents;
      subtotalNetCents += lineTotalCents;
      items.push({
        kitId: kit.id,
        quantity: line.quantity,
        fragrance: null,
        name: kit.name,
        priceCents: unit,
        imagePath: kit.image_path,
        firstColor: null,
        lineTotalCents,
        maxStock: maxKitsAvailableFromItems(kitItems, "storefront"),
      });
    }
  }

  return NextResponse.json({
    lines,
    items,
    subtotalCents,
    subtotalNetCents,
    subtotalVatCents,
    wholesaleDiscountPercent: wholesalePct,
    suggestions,
  });
}
