import {
  getCart,
  isCartKitLine,
  isCartProductLine,
  normalizeCartForCheckout,
  type CartLine,
} from "@/lib/cart";
import { fetchKitsWithItems } from "@/lib/load-product-kits";
import {
  kitIsAvailable,
  maxKitsAvailableFromItems,
} from "@/lib/product-kits";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Misma lógica que checkout: publicados, stock y kits disponibles. */
export async function normalizeStorefrontCartLines(
  cart: CartLine[],
): Promise<CartLine[]> {
  if (!cart.length) return [];

  const productLines = cart.filter(isCartProductLine);
  const kitLines = cart.filter(isCartKitLine);

  const supabase = await createSupabaseServerClient();
  const next: CartLine[] = [];

  if (productLines.length > 0) {
    const ids = [...new Set(productLines.map((l) => l.productId))];
    const { data: products } = await supabase
      .from("products")
      .select("id,is_published,stock_quantity")
      .in("id", ids);

    const byId = new Map(
      (products ?? []).map((p) => [
        p.id,
        {
          is_published: p.is_published,
          stock_quantity: p.stock_quantity,
        },
      ]),
    );
    next.push(...normalizeCartForCheckout(productLines, byId));
  }

  if (kitLines.length > 0) {
    const kits = await fetchKitsWithItems(supabase, { publishedOnly: true });
    const byKitId = new Map(kits.map((k) => [k.id, k]));
    const merged = new Map<string, number>();
    for (const line of kitLines) {
      merged.set(line.kitId, (merged.get(line.kitId) ?? 0) + line.quantity);
    }
    for (const [kitId, qty] of merged) {
      const kit = byKitId.get(kitId);
      if (!kit || !kitIsAvailable(kit, "storefront")) continue;
      const maxK = maxKitsAvailableFromItems(kit.items ?? [], "storefront");
      const q = Math.min(qty, maxK);
      if (q > 0) next.push({ kitId, quantity: q });
    }
  }

  return next;
}

export async function getStorefrontCartLines(): Promise<CartLine[]> {
  return normalizeStorefrontCartLines(await getCart());
}

export async function getStorefrontCartItemCount(): Promise<number> {
  const lines = await getStorefrontCartLines();
  return lines.reduce((n, l) => n + l.quantity, 0);
}

/** Mapa productId → unidades (para pasar a tarjetas de listado). */
export async function getStorefrontCartQuantityByProductId(): Promise<
  Record<string, number>
> {
  const lines = await getStorefrontCartLines();
  const out: Record<string, number> = {};
  for (const l of lines) {
    if (!isCartProductLine(l)) continue;
    out[l.productId] = (out[l.productId] ?? 0) + l.quantity;
  }
  return out;
}

export async function getStorefrontCartQuantityByKitId(): Promise<
  Record<string, number>
> {
  const lines = await getStorefrontCartLines();
  const out: Record<string, number> = {};
  for (const l of lines) {
    if (!isCartKitLine(l)) continue;
    out[l.kitId] = (out[l.kitId] ?? 0) + l.quantity;
  }
  return out;
}
