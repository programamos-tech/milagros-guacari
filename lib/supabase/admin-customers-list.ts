import type { SupabaseClient } from "@supabase/supabase-js";

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

type StatBucket = {
  purchases: number;
  totalSpent: number;
  lastPurchaseAt: string;
  lastOrderId: string;
};

const CUSTOMER_SELECT =
  "id,name,email,phone,document_id,shipping_address,shipping_city,shipping_postal_code,source,customer_kind,wholesale_discount_percent";

function sanitizeIlikeQuery(q: string): string {
  return q.replace(/[%_\\,]/g, "").trim().slice(0, 80);
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

function mapCustomerRow(
  raw: Record<string, unknown>,
  statsById: Map<string, StatBucket>,
  statsByEmail: Map<string, StatBucket>,
): AdminCustomerListRow {
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
  let st = statsById.get(r.id);
  if (!st && emailKey) st = statsByEmail.get(emailKey);

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
}

type OrderStatRow = {
  customer_id?: string | null;
  customer_email?: string | null;
  total_cents: number | null;
  created_at: string | null;
  id: string;
};

function buildStatsMapsFromOrders(orders: OrderStatRow[]): {
  byCustomerId: Map<string, StatBucket>;
  byEmail: Map<string, StatBucket>;
} {
  const byCustomerId = new Map<string, StatBucket>();
  const byEmail = new Map<string, StatBucket>();

  const bump = (
    map: Map<string, StatBucket>,
    key: string,
    cents: number,
    when: string,
    orderId: string,
  ) => {
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

async function fetchOrderStatsForCustomers(
  supabase: SupabaseClient,
  pageCustomers: { id: string; email: string | null }[],
): Promise<{
  byCustomerId: Map<string, StatBucket>;
  byEmail: Map<string, StatBucket>;
}> {
  const byCustomerId = new Map<string, StatBucket>();
  const byEmail = new Map<string, StatBucket>();
  const customerIds = pageCustomers.map((c) => c.id);

  if (customerIds.length > 0) {
    const { data, error } = await supabase
      .from("orders")
      .select("id,customer_id,customer_email,total_cents,created_at")
      .in("customer_id", customerIds);

    if (!error && data?.length) {
      const maps = buildStatsMapsFromOrders(data as OrderStatRow[]);
      for (const [k, v] of maps.byCustomerId) byCustomerId.set(k, v);
    }
  }

  const emailsForFallback: string[] = [];
  for (const c of pageCustomers) {
    if (byCustomerId.has(c.id)) continue;
    const email = c.email?.trim();
    if (email) emailsForFallback.push(email);
  }

  if (emailsForFallback.length > 0) {
    const { data, error } = await supabase
      .from("orders")
      .select("id,customer_id,customer_email,total_cents,created_at")
      .is("customer_id", null)
      .in("customer_email", emailsForFallback);

    if (!error && data?.length) {
      const maps = buildStatsMapsFromOrders(data as OrderStatRow[]);
      for (const [k, v] of maps.byEmail) byEmail.set(k, v);
    }
  }

  return { byCustomerId, byEmail };
}

export type FetchAdminCustomersPageOpts = {
  q?: string;
  page: number;
  pageSize: number;
};

export type FetchAdminCustomersPageResult = {
  rows: AdminCustomerListRow[];
  total: number;
  error: { message: string } | null;
  withoutShippingFields: boolean;
};

/**
 * Listado admin paginado: clientes en SQL + stats de pedidos solo para la página actual.
 */
export async function fetchAdminCustomersPage(
  supabase: SupabaseClient,
  opts: FetchAdminCustomersPageOpts,
): Promise<FetchAdminCustomersPageResult> {
  const qRaw = opts.q?.trim() ?? "";
  const q = qRaw ? sanitizeIlikeQuery(qRaw) : "";
  const safePage = Math.max(1, Math.floor(opts.page));
  const safeSize = Math.min(100, Math.max(1, Math.floor(opts.pageSize)));
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;

  let query = supabase
    .from("customers")
    .select(CUSTOMER_SELECT, { count: "exact" })
    .order("name", { ascending: true })
    .range(from, to);

  if (q) {
    const pattern = `%${q}%`;
    query = query.or(
      [
        `name.ilike.${pattern}`,
        `email.ilike.${pattern}`,
        `phone.ilike.${pattern}`,
        `document_id.ilike.${pattern}`,
        `shipping_address.ilike.${pattern}`,
        `shipping_city.ilike.${pattern}`,
      ].join(","),
    );
  }

  const { data: customerRows, error: cErr, count } = await query;

  if (cErr) {
    return {
      rows: [],
      total: 0,
      error: cErr,
      withoutShippingFields: false,
    };
  }

  const rawRows = customerRows ?? [];
  const pageCustomers = rawRows.map((r) => {
    const row = r as { id: string; email?: string | null };
    return { id: String(row.id), email: row.email ?? null };
  });

  const { byCustomerId, byEmail } = await fetchOrderStatsForCustomers(
    supabase,
    pageCustomers,
  );

  const rows = rawRows.map((raw) =>
    mapCustomerRow(
      raw as Record<string, unknown>,
      byCustomerId,
      byEmail,
    ),
  );

  return {
    rows,
    total: count ?? rows.length,
    error: null,
    withoutShippingFields: false,
  };
}
