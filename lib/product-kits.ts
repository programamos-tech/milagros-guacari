import { storefrontListGrossUnitCents } from "@/lib/storefront-gross-price";
import { unitPriceGrossCents } from "@/lib/product-vat-price";

export type KitPricingMode = "sum_discount" | "fixed";

export type KitStockContext = "storefront" | "pos";

export type KitComponentRow = {
  product_id: string;
  quantity: number;
  products: {
    id: string;
    name: string;
    price_cents: number;
    cost_cents: number | null;
    stock_quantity: number | null;
    stock_local: number | null;
    stock_warehouse: number | null;
    is_published: boolean | null;
    has_vat: boolean | null;
    vat_percent: number | null;
    reference: string | null;
  } | null;
};

export type ProductKitRow = {
  id: string;
  name: string;
  description: string;
  image_path: string | null;
  is_published: boolean;
  pricing_mode: KitPricingMode;
  discount_percent: number;
  price_cents: number;
  sort_order: number;
  items?: KitComponentRow[];
};

export type KitComponentDeduction = {
  product_id: string;
  stock_deducted_local: number;
  stock_deducted_warehouse: number;
};

export function productStockForKitContext(
  product: {
    stock_quantity?: number | null;
    stock_local?: number | null;
  },
  context: KitStockContext,
): number {
  if (context === "pos") {
    const local = Math.max(0, Math.floor(Number(product.stock_local ?? 0)));
    if (local > 0) return local;
    return Math.max(0, Math.floor(Number(product.stock_quantity ?? 0)));
  }
  return Math.max(0, Math.floor(Number(product.stock_quantity ?? 0)));
}

/** Cuántos kits completos se pueden armar con el stock actual. */
export function maxKitsAvailableFromItems(
  items: KitComponentRow[],
  context: KitStockContext,
): number {
  if (items.length === 0) return 0;
  let minKits = Number.POSITIVE_INFINITY;
  for (const row of items) {
    const p = row.products;
    if (!p || !p.is_published) return 0;
    const perKit = Math.max(1, Math.floor(Number(row.quantity ?? 0)));
    const stock = productStockForKitContext(p, context);
    const kits = Math.floor(stock / perKit);
    minKits = Math.min(minKits, kits);
  }
  return Number.isFinite(minKits) ? Math.max(0, minKits) : 0;
}

export function kitIsAvailable(
  kit: Pick<ProductKitRow, "is_published" | "items">,
  context: KitStockContext,
): boolean {
  if (!kit.is_published) return false;
  const items = kit.items ?? [];
  if (items.length === 0) return false;
  return maxKitsAvailableFromItems(items, context) >= 1;
}

/** Suma precio bruto de venta de componentes (sin descuento del kit). */
export function kitComponentsGrossSumCents(
  items: KitComponentRow[],
  context: KitStockContext,
): number {
  let sum = 0;
  for (const row of items) {
    const p = row.products;
    if (!p) continue;
    const qty = Math.max(1, Math.floor(Number(row.quantity ?? 0)));
    const unit =
      context === "storefront"
        ? storefrontListGrossUnitCents(p.price_cents, p.has_vat)
        : unitPriceGrossCents(
            Math.max(0, Math.floor(Number(p.price_cents ?? 0))),
            Boolean(p.has_vat),
            p.vat_percent,
          );
    sum += unit * qty;
  }
  return sum;
}

export function kitComponentsCostSumCents(items: KitComponentRow[]): number {
  let sum = 0;
  for (const row of items) {
    const p = row.products;
    if (!p) continue;
    const qty = Math.max(1, Math.floor(Number(row.quantity ?? 0)));
    sum += Math.max(0, Math.floor(Number(p.cost_cents ?? 0))) * qty;
  }
  return sum;
}

/** Precio final del kit en centavos COP. */
export function resolveKitSalePriceCents(
  kit: Pick<ProductKitRow, "pricing_mode" | "discount_percent" | "price_cents">,
  items: KitComponentRow[],
  context: KitStockContext,
): number {
  const sumGross = kitComponentsGrossSumCents(items, context);
  if (kit.pricing_mode === "fixed") {
    return Math.max(0, Math.floor(Number(kit.price_cents ?? 0)));
  }
  const pct = Math.min(100, Math.max(0, Math.floor(Number(kit.discount_percent ?? 0))));
  return Math.max(0, Math.round(sumGross * (1 - pct / 100)));
}

export function kitMarginPreview(
  kit: Pick<ProductKitRow, "pricing_mode" | "discount_percent" | "price_cents">,
  items: KitComponentRow[],
  context: KitStockContext = "pos",
): {
  sumGrossCents: number;
  costCents: number;
  saleCents: number;
  marginCents: number;
  marginPercent: number | null;
} {
  const sumGrossCents = kitComponentsGrossSumCents(items, context);
  const costCents = kitComponentsCostSumCents(items);
  const saleCents = resolveKitSalePriceCents(kit, items, context);
  const marginCents = saleCents - costCents;
  const marginPercent =
    saleCents > 0 ? Math.round((marginCents / saleCents) * 1000) / 10 : null;
  return { sumGrossCents, costCents, saleCents, marginCents, marginPercent };
}

/** Expande kits vendidos a cantidades por producto (para descontar stock). */
export function expandKitLinesToProductQty(
  kitLines: { kitId: string; quantity: number }[],
  kitsById: Map<string, ProductKitRow>,
): Map<string, number> {
  const qtyByProduct = new Map<string, number>();
  for (const kl of kitLines) {
    const kit = kitsById.get(kl.kitId);
    if (!kit?.items?.length) continue;
    const kitQty = Math.max(1, Math.floor(kl.quantity));
    for (const row of kit.items) {
      const pid = String(row.product_id);
      const perKit = Math.max(1, Math.floor(Number(row.quantity ?? 0)));
      qtyByProduct.set(pid, (qtyByProduct.get(pid) ?? 0) + perKit * kitQty);
    }
  }
  return qtyByProduct;
}

/** Deducciones por componente al vender un kit en POS (solo local). */
export function buildKitPosComponentDeductions(
  kit: ProductKitRow,
  kitQuantity: number,
): KitComponentDeduction[] {
  const out: KitComponentDeduction[] = [];
  const kq = Math.max(1, Math.floor(kitQuantity));
  for (const row of kit.items ?? []) {
    const perKit = Math.max(1, Math.floor(Number(row.quantity ?? 0)));
    out.push({
      product_id: String(row.product_id),
      stock_deducted_local: perKit * kq,
      stock_deducted_warehouse: 0,
    });
  }
  return out;
}

/** Deducciones al pagar kit en web (local primero, luego bodega). */
export function buildKitStorefrontComponentDeductions(
  kit: ProductKitRow,
  kitQuantity: number,
): KitComponentDeduction[] {
  const out: KitComponentDeduction[] = [];
  const kq = Math.max(1, Math.floor(kitQuantity));
  for (const row of kit.items ?? []) {
    const p = row.products;
    if (!p) continue;
    let need = Math.max(1, Math.floor(Number(row.quantity ?? 0))) * kq;
    let l = Math.max(0, Math.floor(Number(p.stock_local ?? 0)));
    let w = Math.max(0, Math.floor(Number(p.stock_warehouse ?? 0)));
    const takeL = Math.min(l, need);
    need -= takeL;
    const takeW = Math.min(w, need);
    out.push({
      product_id: String(row.product_id),
      stock_deducted_local: takeL,
      stock_deducted_warehouse: takeW,
    });
  }
  return out;
}

export const KIT_ITEMS_SELECT = `
  id,
  product_id,
  quantity,
  sort_order,
  products (
    id,
    name,
    price_cents,
    cost_cents,
    stock_quantity,
    stock_local,
    stock_warehouse,
    is_published,
    has_vat,
    vat_percent,
    reference
  )
`;
