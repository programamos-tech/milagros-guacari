import {
  unitNetFromPosChargedUnitCents,
  unitPriceGrossCents,
  unitPriceNetCents,
} from "@/lib/product-vat-price";

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
  /** Costo de compra sin IVA por unidad (inventario). */
  cost_cents?: number | null;
};

function isPosOrder(wompiReference: string | null | undefined): boolean {
  return String(wompiReference ?? "").startsWith("POS:");
}

/**
 * Aporte de una línea a base (sin IVA) y a cobrado (con IVA), en centavos.
 * Misma regla que {@link revenueNetGrossFromLines} por línea.
 */
export function lineNetGrossCents(
  order: OrderRowRef,
  it: OrderItemRow,
  p: ProductVatRow | undefined,
): { net: number; gross: number } | null {
  const qty = Math.max(0, Math.floor(Number(it.quantity ?? 0)));
  if (qty <= 0) return null;
  const unit = Math.max(0, Math.round(Number(it.unit_price_cents ?? 0)));
  const pos = isPosOrder(order.wompi_reference);

  if (pos) {
    if (p && p.has_vat === true) {
      const catalogNet = unitPriceNetCents(p.price_cents);
      const catalogGross = unitPriceGrossCents(
        p.price_cents,
        true,
        p.vat_percent,
      );
      const dn = Math.abs(unit - catalogNet);
      const dg = Math.abs(unit - catalogGross);
      const tol = Math.max(2, Math.round(catalogNet * 0.005));
      if (dn < dg && dn <= tol) {
        return {
          net: unit * qty,
          gross: unitPriceGrossCents(unit, true, p.vat_percent) * qty,
        };
      }
      return {
        gross: unit * qty,
        net: unitNetFromPosChargedUnitCents(unit, true, p.vat_percent) * qty,
      };
    }
    const line = unit * qty;
    return { net: line, gross: line };
  }
  /** Web tienda: el unitario guardado es con IVA (precio al público). Pedidos antiguos pueden tener neto = catálogo. */
  if (p?.has_vat) {
    const catalogNet = unitPriceNetCents(p.price_cents);
    const tol = Math.max(4, Math.round(catalogNet * 0.02));
    if (Math.abs(unit - catalogNet) <= tol) {
      return {
        net: unit * qty,
        gross: unitPriceGrossCents(unit, true, p.vat_percent) * qty,
      };
    }
  }
  const lineGross = unit * qty;
  const lineNet = p?.has_vat
    ? unitNetFromPosChargedUnitCents(unit, true, p.vat_percent) * qty
    : lineGross;
  return { net: lineNet, gross: lineGross };
}

/**
 * NET = base imponible sin IVA (suma por línea).
 * GROSS = total cobrado con IVA.
 * - **Web**: `unit_price_cents` = unitario al público **con IVA** cuando el producto tiene IVA;
 *   el neto se obtiene con {@link unitNetFromPosChargedUnitCents}.
 * - **POS**: el unitario en ítems suele ser el **cobrado con IVA** en ticket; si coincide con el
 *   catálogo **sin** IVA, se asume que el POS guardó base y el bruto se recalcula con IVA.
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

  let net = 0;
  let gross = 0;

  for (const it of lines) {
    const pid = it.product_id;
    const p = pid ? productsById.get(pid) : undefined;
    const lg = lineNetGrossCents(order, it, p);
    if (lg) {
      net += lg.net;
      gross += lg.gross;
    }
  }

  return { net, gross };
}

/**
 * Ganancia bruta (margen): Σ por línea (base vendida sin IVA − `cost_cents` del producto × cantidad).
 * Solo líneas con ítem; pedidos sin líneas no aportan (no hay costo por producto).
 */
export function sumGrossProfitNetOnLinesForPaidOrders(
  orders: OrderRowRef[],
  items: OrderItemRow[],
  productsById: Map<string, ProductVatRow>,
): number {
  let sum = 0;
  for (const o of orders) {
    if (o.status !== "paid") continue;
    const lines = items.filter((i) => i.order_id === o.id);
    for (const it of lines) {
      const p = it.product_id ? productsById.get(it.product_id) : undefined;
      const lg = lineNetGrossCents(o, it, p);
      if (!lg) continue;
      const qty = Math.max(0, Math.floor(Number(it.quantity ?? 0)));
      const costUnit =
        p != null && p.cost_cents != null && Number.isFinite(Number(p.cost_cents))
          ? Math.max(0, Math.round(Number(p.cost_cents)))
          : 0;
      sum += lg.net - costUnit * qty;
    }
  }
  return sum;
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
