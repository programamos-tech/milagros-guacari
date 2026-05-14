import type { SupabaseClient } from "@supabase/supabase-js";

const ORDERS_SELECT_FULL =
  "id,customer_id,customer_email,customer_name,total_cents,created_at,shipping_phone,shipping_address,shipping_city,shipping_postal_code";

const ORDERS_SELECT_MIN =
  "id,customer_id,customer_email,customer_name,total_cents,created_at";

/** Pedidos sin columna `customer_id` (previo a migración de clientes). */
const ORDERS_LEGACY_SHIP =
  "id,customer_email,customer_name,total_cents,created_at,shipping_phone,shipping_address,shipping_city,shipping_postal_code";

const ORDERS_LEGACY_MIN =
  "id,customer_email,customer_name,total_cents,created_at";

export type AdminCustomerListRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  documentId: string | null;
  source: string;
  customerKind: string;
  wholesaleDiscountPercent: number;
  addressLine: string | null;
  cityLine: string | null;
  purchases: number;
  totalSpent: number;
  lastPurchaseAt: string | null;
  lastOrderId: string | null;
};

type OrderAgg = {
  customer_id?: string | null;
  customer_email: string | null;
  customer_name?: string | null;
  total_cents: number | null;
  created_at: string | null;
  id: string;
};

function looksLikeMissingShippingColumn(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("does not exist") ||
    (/column/i.test(m) && /shipping/i.test(m)) ||
    /shipping_phone|shipping_address|shipping_city|shipping_postal/i.test(m)
  );
}

function looksLikeMissingCustomerIdColumn(message: string): boolean {
  const m = message.toLowerCase();
  return /customer_id/i.test(m) && (m.includes("does not exist") || /column/i.test(m));
}

async function fetchOrdersForStats(supabase: SupabaseClient): Promise<{
  orders: OrderAgg[];
  error: { message: string } | null;
  withoutShippingFields: boolean;
}> {
  const attempts: { sel: string; shipping: boolean }[] = [
    { sel: ORDERS_SELECT_FULL, shipping: true },
    { sel: ORDERS_SELECT_MIN, shipping: false },
    { sel: ORDERS_LEGACY_SHIP, shipping: true },
    { sel: ORDERS_LEGACY_MIN, shipping: false },
  ];

  let lastErr: { message: string } | null = null;

  for (const { sel, shipping } of attempts) {
    const res = await supabase
      .from("orders")
      .select(sel)
      .order("created_at", { ascending: false })
      .limit(8000);

    if (!res.error) {
      return {
        orders: (res.data ?? []) as unknown as OrderAgg[],
        error: null,
        withoutShippingFields: !shipping,
      };
    }

    lastErr = res.error;
    const msg = res.error.message ?? "";

    if (looksLikeMissingCustomerIdColumn(msg) && sel.includes("customer_id")) {
      continue;
    }
    if (looksLikeMissingShippingColumn(msg) && sel.includes("shipping_phone")) {
      continue;
    }
    return { orders: [], error: res.error, withoutShippingFields: false };
  }

  return {
    orders: [],
    error: lastErr ?? { message: "No se pudieron cargar pedidos" },
    withoutShippingFields: false,
  };
}

type StatBucket = {
  purchases: number;
  totalSpent: number;
  lastPurchaseAt: string;
  lastOrderId: string;
};

function buildStatsMaps(orders: OrderAgg[]): {
  byCustomerId: Map<string, StatBucket>;
  byEmail: Map<string, StatBucket>;
} {
  const byCustomerId = new Map<string, StatBucket>();
  const byEmail = new Map<string, StatBucket>();

  const bump = (map: Map<string, StatBucket>, key: string, cents: number, when: string, orderId: string) => {
    const cur = map.get(key);
    if (!cur) {
      map.set(key, {
        purchases: 1,
        totalSpent: cents,
        lastPurchaseAt: when,
        lastOrderId: orderId,
      });
      return;
    }
    cur.purchases += 1;
    cur.totalSpent += cents;
    if (new Date(when) > new Date(cur.lastPurchaseAt)) {
      cur.lastPurchaseAt = when;
      cur.lastOrderId = orderId;
    }
  };

  for (const o of orders) {
    const cents = Number(o.total_cents ?? 0);
    const when = String(o.created_at ?? "");
    const oid = String(o.id);
    const cid =
      o.customer_id !== undefined && o.customer_id !== null
        ? String(o.customer_id)
        : null;
    const ek = String(o.customer_email ?? "").trim().toLowerCase();

    if (cid) bump(byCustomerId, cid, cents, when, oid);
    else if (ek) bump(byEmail, ek, cents, when, oid);
  }

  return { byCustomerId, byEmail };
}

function linesFromCustomerRow(r: {
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_postal_code: string | null;
}): { addressLine: string | null; cityLine: string | null } {
  const addr = String(r.shipping_address ?? "").trim();
  const city = String(r.shipping_city ?? "").trim();
  const postal = String(r.shipping_postal_code ?? "").trim();
  const cityLine =
    [city, postal].filter(Boolean).join(city && postal ? " · " : "") || null;
  return {
    addressLine: addr || null,
    cityLine,
  };
}

/**
 * Listado admin: filas de `customers` + totales desde `orders`.
 */
export async function fetchAdminCustomersWithStats(supabase: SupabaseClient): Promise<{
  rows: AdminCustomerListRow[];
  error: { message: string } | null;
  withoutShippingFields: boolean;
}> {
  const { data: customerRows, error: cErr } = await supabase
    .from("customers")
    .select(
      "id,name,email,phone,document_id,shipping_address,shipping_city,shipping_postal_code,source,created_at,customer_kind,wholesale_discount_percent",
    )
    .order("name", { ascending: true });

  if (cErr) {
    return { rows: [], error: cErr, withoutShippingFields: false };
  }

  const { orders, error: oErr, withoutShippingFields } =
    await fetchOrdersForStats(supabase);

  if (oErr) {
    return { rows: [], error: oErr, withoutShippingFields: false };
  }

  const { byCustomerId, byEmail } = buildStatsMaps(orders);

  const rows: AdminCustomerListRow[] = (customerRows ?? []).map((raw) => {
    const r = raw as {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      document_id: string | null;
      shipping_address: string | null;
      shipping_city: string | null;
      shipping_postal_code: string | null;
      source: string;
      customer_kind?: string | null;
      wholesale_discount_percent?: number | null;
    };

    const emailKey = r.email ? r.email.trim().toLowerCase() : "";
    let st = byCustomerId.get(r.id);
    if (!st && emailKey) st = byEmail.get(emailKey);

    const { addressLine, cityLine } = linesFromCustomerRow(r);

    return {
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone?.trim() || "—",
      documentId: r.document_id,
      source: r.source,
      customerKind: String(r.customer_kind ?? "retail"),
      wholesaleDiscountPercent: Math.max(
        0,
        Math.min(100, Math.floor(Number(r.wholesale_discount_percent ?? 0))),
      ),
      addressLine,
      cityLine,
      purchases: st?.purchases ?? 0,
      totalSpent: st?.totalSpent ?? 0,
      lastPurchaseAt: st?.lastPurchaseAt ?? null,
      lastOrderId: st?.lastOrderId ?? null,
    };
  });

  return { rows, error: null, withoutShippingFields };
}
