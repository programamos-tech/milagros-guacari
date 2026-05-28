import { cookies } from "next/headers";

export type CartProductLine = {
  productId: string;
  quantity: number;
  /** Etiqueta de fragancia elegida en PDP (debe coincidir con `fragrance_options`). */
  fragrance?: string;
};

export type CartKitLine = {
  kitId: string;
  quantity: number;
};

export type CartLine = CartProductLine | CartKitLine;

export function isCartKitLine(line: CartLine): line is CartKitLine {
  return "kitId" in line && typeof line.kitId === "string";
}

export function isCartProductLine(line: CartLine): line is CartProductLine {
  return "productId" in line && typeof line.productId === "string";
}

export function cartLinesMatchFragrance(
  a: Pick<CartProductLine, "productId" | "fragrance">,
  b: Pick<CartProductLine, "productId" | "fragrance">,
): boolean {
  return (
    a.productId === b.productId &&
    (a.fragrance ?? "").trim() === (b.fragrance ?? "").trim()
  );
}

export function cartLinesMatchKit(
  a: Pick<CartKitLine, "kitId">,
  b: Pick<CartKitLine, "kitId">,
): boolean {
  return a.kitId === b.kitId;
}

const CART_COOKIE = "tiendas_cart";

function parseCartLine(raw: unknown): CartLine | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const quantity = Math.floor(Number(row.quantity));
  if (!Number.isFinite(quantity) || quantity <= 0) return null;

  const kitId = typeof row.kitId === "string" ? row.kitId.trim() : "";
  if (kitId) return { kitId, quantity };

  const productId = typeof row.productId === "string" ? row.productId.trim() : "";
  if (!productId) return null;
  const fragrance =
    typeof row.fragrance === "string" && row.fragrance.trim()
      ? row.fragrance.trim()
      : undefined;
  return { productId, quantity, fragrance };
}

export async function getCart(): Promise<CartLine[]> {
  const jar = await cookies();
  const raw = jar.get(CART_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: CartLine[] = [];
    for (const item of parsed) {
      const line = parseCartLine(item);
      if (line) out.push(line);
    }
    return out;
  } catch {
    return [];
  }
}

export async function setCart(lines: CartLine[]) {
  const jar = await cookies();
  jar.set(CART_COOKIE, JSON.stringify(lines), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

/** Solo productos publicados; cantidad acotada al stock. Sin escritura de cookies. */
export function normalizeCartForCheckout(
  cart: CartProductLine[],
  byId: Map<
    string,
    { is_published: boolean | null; stock_quantity: number | null }
  >,
): CartProductLine[] {
  const next: CartProductLine[] = [];
  for (const line of cart) {
    const p = byId.get(line.productId);
    if (!p || !p.is_published) continue;
    const stock = Math.max(0, Math.floor(Number(p.stock_quantity ?? 0)));
    const q = Math.min(line.quantity, stock);
    if (q > 0) {
      next.push({
        productId: line.productId,
        quantity: q,
        ...(line.fragrance ? { fragrance: line.fragrance } : {}),
      });
    }
  }
  return next;
}
