"use server";

import { logAdminActivity } from "@/lib/admin-activity-log";
import {
  activityStockTraceToMetadata,
  buildPosSaleStockTrace,
} from "@/lib/activity-log-stock";
import { verifyInsertedRow, verifyRowCountAtLeast } from "@/lib/admin-insert-verify";
import { requireAdminPermission } from "@/lib/require-admin-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  unitPriceAfterWholesaleCents,
  wholesaleDiscountPercentFromRow,
} from "@/lib/customer-wholesale-pricing";
import {
  applyPosLineNetDiscountCents,
  discountedUnitNetCentsFromLine,
} from "@/lib/pos-line-discount";
import { fetchKitsByIdsWithItems } from "@/lib/load-product-kits";
import {
  buildKitPosComponentDeductions,
  expandKitLinesToProductQty,
  kitIsAvailable,
  maxKitsAvailableFromItems,
  resolveKitSalePriceCents,
  type ProductKitRow,
} from "@/lib/product-kits";
import { unitPriceGrossCents } from "@/lib/product-vat-price";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type PosInvoiceKitLinePayload = {
  kitId: string;
  quantity: number;
};

export type PosInvoiceLinePayload = {
  productId: string;
  quantity: number;
  /** 1–100: descuento % sobre neto de línea (post-mayorista). Si se envía, ignora monto. */
  discountPercent?: number | null;
  /** COP en centavos sobre neto total de línea; solo si no hay % válido. */
  discountAmountCents?: number | null;
};

export type PosInvoicePayload = {
  customerId: string;
  lines: PosInvoiceLinePayload[];
  kitLines?: PosInvoiceKitLinePayload[];
  paymentMethod: "cash" | "transfer" | "mixed";
  shippingAddress: string | null;
  shippingPhone: string | null;
};

function redirectError(code: string): never {
  redirect(`/admin/ventas/nueva?error=${encodeURIComponent(code)}`);
}

function isStockRpcMissingError(err: {
  message?: string;
  code?: string;
  details?: string;
}): boolean {
  const m = `${err.message ?? ""} ${err.details ?? ""}`.toLowerCase();
  return (
    err.code === "42883" ||
    err.code === "PGRST202" ||
    m.includes("decrement_products_stock_local") ||
    m.includes("could not find the function") ||
    m.includes("schema cache")
  );
}

/** Descuenta stock_local; usa RPC si existe, si no el update secuencial (compatibilidad). */
async function decrementPosStockLocal(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  qtyByProduct: Map<string, number>,
  productById: Map<string, { stock_local?: number | null }>,
): Promise<"ok" | "stock" | "db"> {
  const stockItems = [...qtyByProduct.entries()].map(([product_id, quantity]) => ({
    product_id,
    quantity,
  }));

  const { error: stockErr } = await supabase.rpc("decrement_products_stock_local", {
    p_items: stockItems,
  });

  if (!stockErr) return "ok";

  const stockMsg = `${stockErr.message ?? ""} ${stockErr.details ?? ""}`.toLowerCase();
  if (stockMsg.includes("insufficient_stock")) return "stock";
  if (!isStockRpcMissingError(stockErr)) return "db";

  const stockRollback: { id: string; prev: number }[] = [];
  for (const [pid, qty] of qtyByProduct) {
    const p = productById.get(pid)!;
    const prev = Number(p.stock_local ?? 0);
    const next = Math.max(0, prev - qty);
    const { error: uErr } = await supabase
      .from("products")
      .update({ stock_local: next })
      .eq("id", pid);
    if (uErr) {
      for (const r of stockRollback) {
        await supabase.from("products").update({ stock_local: r.prev }).eq("id", r.id);
      }
      return "db";
    }
    stockRollback.push({ id: pid, prev });
  }
  return "ok";
}

export async function createPosInvoiceAction(formData: FormData) {
  const { userId } = await requireAdminPermission("ventas_crear");
  const supabase = await createSupabaseServerClient();

  let payload: PosInvoicePayload;
  try {
    const raw = String(formData.get("payload") ?? "").trim();
    if (!raw) redirectError("validation");
    payload = JSON.parse(raw) as PosInvoicePayload;
  } catch {
    redirectError("validation");
  }

  const customerId = String(payload.customerId ?? "").trim();
  if (!customerId) redirectError("validation");

  const linesRaw = Array.isArray(payload.lines) ? payload.lines : [];
  const lines = linesRaw
    .map((row) => {
      const productId = String((row as { productId?: string }).productId ?? "").trim();
      const quantity = Math.floor(Number((row as { quantity?: number }).quantity));
      const pctRaw = (row as { discountPercent?: unknown }).discountPercent;
      const amtRaw = (row as { discountAmountCents?: unknown }).discountAmountCents;
      const pct =
        pctRaw != null && pctRaw !== "" && Number.isFinite(Number(pctRaw))
          ? Math.floor(Number(pctRaw))
          : null;
      const amt = Math.max(0, Math.floor(Number(amtRaw ?? 0)));
      return { productId, quantity, discountPercent: pct, discountAmountCents: amt };
    })
    .filter((r) => r.productId && r.quantity > 0);

  const kitLinesRaw = Array.isArray(payload.kitLines) ? payload.kitLines : [];
  const kitLines = kitLinesRaw
    .map((row) => {
      const kitId = String((row as { kitId?: string }).kitId ?? "").trim();
      const quantity = Math.floor(Number((row as { quantity?: number }).quantity));
      return { kitId, quantity };
    })
    .filter((r) => r.kitId && r.quantity > 0);

  if (lines.length === 0 && kitLines.length === 0) redirectError("validation");

  for (const l of lines) {
    if (l.discountPercent != null) {
      if (l.discountPercent < 0 || l.discountPercent > 100) redirectError("validation");
    }
    if (l.discountAmountCents < 0) redirectError("validation");
  }

  const paymentMethod = payload.paymentMethod;
  if (paymentMethod !== "cash" && paymentMethod !== "transfer" && paymentMethod !== "mixed") {
    redirectError("validation");
  }

  const kitIds = [...new Set(kitLines.map((k) => k.kitId))];

  const [customerRes, kitsLoaded] = await Promise.all([
    supabase
      .from("customers")
      .select(
        "id,name,email,phone,document_id,shipping_address,customer_kind,wholesale_discount_percent",
      )
      .eq("id", customerId)
      .maybeSingle(),
    kitIds.length > 0
      ? fetchKitsByIdsWithItems(supabase, kitIds)
      : Promise.resolve([] as ProductKitRow[]),
  ]);

  const { data: customer, error: cErr } = customerRes;
  if (cErr || !customer) redirectError("customer");
  const customerRow = customer;
  const wholesalePct = wholesaleDiscountPercentFromRow(
    customerRow as {
      customer_kind?: string | null;
      wholesale_discount_percent?: number | null;
    },
  );

  const kitsById = new Map<string, ProductKitRow>();
  for (const kit of kitsLoaded) {
    kitsById.set(kit.id, kit);
  }
  if (kitIds.length > 0) {
    if (kitsById.size !== kitIds.length) redirectError("products");
    for (const kl of kitLines) {
      const kit = kitsById.get(kl.kitId)!;
      if (!kitIsAvailable(kit, "pos")) redirectError("stock");
      const maxK = maxKitsAvailableFromItems(kit.items ?? [], "pos");
      if (maxK < kl.quantity) redirectError("stock");
    }
  }

  const qtyByProduct = new Map<string, number>();
  for (const l of lines) {
    qtyByProduct.set(l.productId, (qtyByProduct.get(l.productId) ?? 0) + l.quantity);
  }
  const kitQtyExpanded = expandKitLinesToProductQty(kitLines, kitsById);
  for (const [pid, qty] of kitQtyExpanded) {
    qtyByProduct.set(pid, (qtyByProduct.get(pid) ?? 0) + qty);
  }

  const lineProductIds = [...new Set(lines.map((l) => l.productId))];
  const stockProductIds = [...qtyByProduct.keys()];
  const productById = new Map<
    string,
    {
      id: string;
      name: string;
      price_cents: number;
      stock_local: number | null;
      stock_warehouse: number | null;
      has_vat: boolean | null;
      vat_percent: number | null;
    }
  >();

  if (stockProductIds.length > 0) {
    const { data: products, error: pErr } = await supabase
      .from("products")
      .select(
        "id,name,price_cents,stock_local,stock_warehouse,has_vat,vat_percent",
      )
      .in("id", stockProductIds);

    if (pErr || !products) redirectError("products");
    for (const p of products) {
      productById.set(p.id as string, p);
    }
    for (const [pid, qty] of qtyByProduct) {
      const p = productById.get(pid);
      if (!p) redirectError("products");
      const stock = Number(p.stock_local ?? 0);
      if (stock < qty) redirectError("stock");
    }
    for (const pid of lineProductIds) {
      if (!productById.has(pid)) redirectError("products");
    }
  }

  let subtotalCents = 0;
  let vatCents = 0;
  let totalCents = 0;
  for (const l of lines) {
    const p = productById.get(l.productId);
    if (!p) redirectError("products");
    const priceCatalog = Math.max(0, Math.floor(Number(p.price_cents ?? 0)));
    const netUnit = unitPriceAfterWholesaleCents(priceCatalog, wholesalePct);
    const lineNetBefore = netUnit * l.quantity;
    const pctForCalc =
      l.discountPercent != null && l.discountPercent > 0 && l.discountPercent <= 100
        ? l.discountPercent
        : null;
    const amtForCalc = pctForCalc != null ? 0 : l.discountAmountCents;
    if (amtForCalc > lineNetBefore) redirectError("validation");
    const lineNetAfter = applyPosLineNetDiscountCents(
      lineNetBefore,
      pctForCalc,
      amtForCalc,
    );
    const discNetUnit = discountedUnitNetCentsFromLine(lineNetAfter, l.quantity);
    const hasVat = Boolean(p.has_vat);
    const unitFinal = unitPriceGrossCents(discNetUnit, hasVat, null);
    subtotalCents += lineNetAfter;
    totalCents += unitFinal * l.quantity;
  }

  for (const kl of kitLines) {
    const kit = kitsById.get(kl.kitId)!;
    const items = kit.items ?? [];
    const unitKit = resolveKitSalePriceCents(kit, items, "pos");
    const lineGross = unitKit * kl.quantity;
    subtotalCents += lineGross;
    totalCents += lineGross;
  }
  vatCents = Math.max(0, totalCents - subtotalCents);

  if (!Number.isFinite(totalCents) || totalCents < 0) redirectError("validation");

  const emailRaw =
    customerRow.email != null ? String(customerRow.email).trim() : "";
  const customerEmail =
    emailRaw.length > 0 ? emailRaw.toLowerCase() : `pos-${customerId.slice(0, 8)}@local.invalid`;

  const shippingAddress =
    payload.shippingAddress != null && String(payload.shippingAddress).trim().length > 0
      ? String(payload.shippingAddress).trim()
      : null;

  const shippingPhone =
    payload.shippingPhone != null && String(payload.shippingPhone).trim().length > 0
      ? String(payload.shippingPhone).trim()
      : customerRow.phone != null
        ? String(customerRow.phone).trim() || null
        : null;

  const wompiRef = `POS:${paymentMethod}`;

  const { data: orderRow, error: oErr } = await supabase
    .from("orders")
    .insert({
      status: "paid",
      customer_name: String(customerRow.name ?? "Cliente"),
      customer_email: customerEmail,
      customer_id: customerId,
      total_cents: totalCents,
      currency: "COP",
      wompi_reference: wompiRef,
      shipping_address: shippingAddress,
      shipping_phone: shippingPhone,
    })
    .select("id")
    .single();

  if (oErr || !orderRow?.id) {
    redirectError("db");
  }

  const orderId = String(orderRow.id);

  const productItemRows = lines.map((l) => {
    const p = productById.get(l.productId)!;
    const priceCatalog = Math.max(0, Math.floor(Number(p.price_cents ?? 0)));
    const netUnit = unitPriceAfterWholesaleCents(priceCatalog, wholesalePct);
    const lineNetBefore = netUnit * l.quantity;
    const pctForCalc =
      l.discountPercent != null && l.discountPercent > 0 && l.discountPercent <= 100
        ? l.discountPercent
        : null;
    const amtForCalc = pctForCalc != null ? 0 : l.discountAmountCents;
    const lineNetAfter = applyPosLineNetDiscountCents(
      lineNetBefore,
      pctForCalc,
      amtForCalc,
    );
    const discNetUnit = discountedUnitNetCentsFromLine(lineNetAfter, l.quantity);
    const unitFinal = unitPriceGrossCents(discNetUnit, Boolean(p.has_vat), null);
    return {
      order_id: orderId,
      product_id: l.productId,
      kit_id: null,
      quantity: l.quantity,
      unit_price_cents: unitFinal,
      product_name_snapshot: String(p.name ?? "Producto"),
      line_discount_percent: pctForCalc,
      line_discount_amount_cents: pctForCalc != null ? 0 : amtForCalc,
      stock_deducted_local: l.quantity,
      stock_deducted_warehouse: 0,
      kit_component_deductions: null,
    };
  });

  const kitItemRows = kitLines.map((kl) => {
    const kit = kitsById.get(kl.kitId)!;
    const items = kit.items ?? [];
    const unitKit = resolveKitSalePriceCents(kit, items, "pos");
    const deductions = buildKitPosComponentDeductions(kit, kl.quantity);
    return {
      order_id: orderId,
      product_id: null,
      kit_id: kl.kitId,
      quantity: kl.quantity,
      unit_price_cents: unitKit,
      product_name_snapshot: `Kit: ${kit.name}`,
      line_discount_percent: null,
      line_discount_amount_cents: 0,
      stock_deducted_local: 0,
      stock_deducted_warehouse: 0,
      kit_component_deductions: deductions,
    };
  });

  const itemRows = [...productItemRows, ...kitItemRows];

  const { error: iErr } = await supabase.from("order_items").insert(itemRows);

  if (iErr) {
    await supabase.from("orders").delete().eq("id", orderId);
    redirectError("db");
  }

  if (process.env.NODE_ENV !== "production") {
    const [orderVerified, itemsVerified] = await Promise.all([
      verifyInsertedRow(supabase, "orders", orderId),
      verifyRowCountAtLeast(
        supabase,
        "order_items",
        { column: "order_id", value: orderId },
        itemRows.length,
      ),
    ]);

    if (!orderVerified) {
      await supabase.from("orders").delete().eq("id", orderId);
      redirectError("db");
    }
    if (!itemsVerified) {
      await supabase.from("order_items").delete().eq("order_id", orderId);
      await supabase.from("orders").delete().eq("id", orderId);
      redirectError("db");
    }
  }

  const stockProductById = new Map(
    [...productById.entries()].map(([id, p]) => [id, { stock_local: p.stock_local }]),
  );

  const stockByProductId = new Map(
    [...productById.entries()].map(([id, p]) => [
      id,
      {
        id,
        name: String(p.name ?? "Producto"),
        stock_local: p.stock_local,
        stock_warehouse: p.stock_warehouse,
      },
    ]),
  );

  const stockTrace = buildPosSaleStockTrace({
    productLines: lines.map((l) => ({
      productId: l.productId,
      name: String(productById.get(l.productId)?.name ?? "Producto"),
      quantity: l.quantity,
    })),
    kitLines: kitLines.map((kl) => {
      const kit = kitsById.get(kl.kitId)!;
      const productNames = new Map(
        (kit.items ?? []).map((row) => [
          String(row.product_id),
          String(row.products?.name ?? "Producto"),
        ]),
      );
      return {
        kitName: String(kit.name ?? "Kit"),
        deductions: buildKitPosComponentDeductions(kit, kl.quantity),
        productNames,
      };
    }),
    stockByProductId,
  });

  const stockResult = await decrementPosStockLocal(supabase, qtyByProduct, stockProductById);
  if (stockResult !== "ok") {
    await supabase.from("orders").delete().eq("id", orderId);
    redirectError(stockResult === "stock" ? "stock" : "db");
  }

  const totalFormatted = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(totalCents / 100);

  await logAdminActivity(supabase, {
    actorId: userId,
    actionType: "sale_created",
    entityType: "order",
    entityId: orderId,
    summary: `Venta a ${String(customerRow.name ?? "Cliente")} · ${totalFormatted}`,
    metadata: {
      customer_id: customerId,
      subtotal_cents: subtotalCents,
      vat_cents: vatCents,
      total_cents: totalCents,
      payment_method: paymentMethod,
      line_items: lines.length,
      kit_lines: kitLines.length,
      ...activityStockTraceToMetadata(stockTrace),
    },
  });
  revalidatePath("/admin/ventas");
  revalidatePath(`/admin/orders/${orderId}`);
  redirect(`/admin/orders/${orderId}`);
}
