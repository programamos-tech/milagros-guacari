import { unitPriceGrossCents } from "@/lib/product-vat-price";

export type OrderRowRef = {
  id: string;
  status: string;
  total_cents: number;
  created_at: string;
  wompi_reference?: string | null;
};

export type OrderItemRow = {
  order_id: string;
  product_id: string | null;
  quantity: number;
  unit_price_cents: number;
};

export type ProductVatRow = {
  id: string;
  price_cents: number;
  has_vat: boolean | null;
  vat_percent: number | null;
};

function isPosOrder(wompiReference: string | null | undefined): boolean {
  return String(wompiReference ?? "").startsWith("POS:");
}

/**
 * NET = base imponible (suma de precios catálogo sin IVA × cantidad).
 * GROSS = total cobrado con IVA cuando aplica (POS siempre guarda unitario final en ítems;
 * web guarda unitario de catálogo = sin IVA).
 */
export function revenueNetGrossFromLines(
  order: OrderRowRef,
  items: OrderItemRow[],
  productsById: Map<string, ProductVatRow>,
): { net: number; gross: number } {
  const lines = items.filter((i) => i.order_id === order.id);
  if (lines.length === 0) {
    const t = Math.max(0, Math.round(Number(order.total_cents ?? 0)));
    return { net: t, gross: t };
  }

  const pos = isPosOrder(order.wompi_reference);
  let net = 0;
  let gross = 0;

  for (const it of lines) {
    const qty = Math.max(0, Math.floor(Number(it.quantity ?? 0)));
    if (qty <= 0) continue;
    const unit = Math.max(0, Math.round(Number(it.unit_price_cents ?? 0)));
    const pid = it.product_id;
    const p = pid ? productsById.get(pid) : undefined;

    if (pos) {
      const lineGross = unit * qty;
      gross += lineGross;
      const base = p ? Math.max(0, Math.round(Number(p.price_cents ?? 0))) : unit;
      net += base * qty;
    } else {
      const lineNet = unit * qty;
      net += lineNet;
      const lineGross = p
        ? unitPriceGrossCents(unit, p.has_vat, p.vat_percent) * qty
        : lineNet;
      gross += lineGross;
    }
  }

  return { net, gross };
}

export function sumRevenueNetGrossForOrders(
  orders: OrderRowRef[],
  items: OrderItemRow[],
  productsById: Map<string, ProductVatRow>,
): { net: number; gross: number } {
  let net = 0;
  let gross = 0;
  for (const o of orders) {
    if (o.status !== "paid") continue;
    const r = revenueNetGrossFromLines(o, items, productsById);
    net += r.net;
    gross += r.gross;
  }
  return { net, gross };
}
