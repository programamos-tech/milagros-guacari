import {
  getCart,
  normalizeCartForCheckout,
  type CartLine,
} from "@/lib/cart";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Misma lógica que checkout: solo publicados y cantidad acotada al stock. */
export async function normalizeStorefrontCartLines(
  cart: CartLine[],
): Promise<CartLine[]> {
  if (!cart.length) return [];
  const supabase = await createSupabaseServerClient();
  const ids = [...new Set(cart.map((l) => l.productId))];
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
  return normalizeCartForCheckout(cart, byId);
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
    out[l.productId] = (out[l.productId] ?? 0) + l.quantity;
  }
  return out;
}
