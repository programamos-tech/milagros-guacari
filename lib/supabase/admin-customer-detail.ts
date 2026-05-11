import type { SupabaseClient } from "@supabase/supabase-js";

export type CustomerAddressRow = {
  id: string;
  label: string;
  address_line: string;
  reference: string;
  sort_order: number;
};

export type AdminCustomerOrderRow = {
  id: string;
  total_cents: number;
  created_at: string | null;
  status: string;
  wompi_reference?: string | null;
};

export type TopProductRow = {
  name: string;
  quantity: number;
};

export type AdminCustomerDetail = {
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    document_id: string | null;
    shipping_address: string | null;
    shipping_city: string | null;
    shipping_postal_code: string | null;
    notes: string | null;
    source: string;
    created_at: string;
  };
  addresses: CustomerAddressRow[];
  ordersPaid: AdminCustomerOrderRow[];
  /** Todos los pedidos enlazados al cliente (cualquier estado), más recientes primero. */
  customerOrders: AdminCustomerOrderRow[];
  topProducts: TopProductRow[];
  /** Sin columna `customer_id` en pedidos: matcheamos por email. */
  matchedOrdersByEmailFallback: boolean;
};

function looksLikeMissingCustomerIdColumn(message: string): boolean {
  const m = message.toLowerCase();
  return /customer_id/i.test(m) && (m.includes("does not exist") || /column/i.test(m));
}

const ORDER_SEL_WITH_CID =
  "id,total_cents,created_at,status,customer_id,customer_email,wompi_reference";
const ORDER_SEL_NO_CID =
  "id,total_cents,created_at,status,customer_email,wompi_reference";

/**
 * Pedidos del cliente: por `customer_id` y/o por email (misma lógica que el listado).
 */
async function fetchOrdersForCustomer(
  supabase: SupabaseClient,
  customerId: string,
  emailNormalized: string | null,
): Promise<{ orders: AdminCustomerOrderRow[]; byEmailFallback: boolean }> {
  const merged = new Map<string, AdminCustomerOrderRow>();
  let usedEmailOnly = false;

  const runById = await supabase
    .from("orders")
    .select(ORDER_SEL_WITH_CID)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (!runById.error && runById.data) {
    for (const row of runById.data as unknown as AdminCustomerOrderRow[]) {
      merged.set(row.id, row);
    }
  }

  if (emailNormalized) {
    const sel =
      runById.error && looksLikeMissingCustomerIdColumn(runById.error.message ?? "")
        ? ORDER_SEL_NO_CID
        : ORDER_SEL_WITH_CID;

    const runByEmail = await supabase
      .from("orders")
      .select(sel)
      .eq("customer_email", emailNormalized)
      .order("created_at", { ascending: false })
      .limit(500);

    if (!runByEmail.error && runByEmail.data) {
      usedEmailOnly =
        Boolean(runById.error && looksLikeMissingCustomerIdColumn(runById.error.message ?? ""));
      for (const row of runByEmail.data as unknown as AdminCustomerOrderRow[]) {
        const r = row as AdminCustomerOrderRow & { customer_id?: string | null };
        if (merged.has(r.id)) continue;
        const cid = r.customer_id ?? null;
        if (cid != null && cid !== customerId) continue;
        merged.set(r.id, {
          id: r.id,
          total_cents: r.total_cents,
          created_at: r.created_at,
          status: r.status,
          wompi_reference:
            "wompi_reference" in r
              ? (r as { wompi_reference?: string | null }).wompi_reference ?? null
              : null,
        });
      }
    }
  }

  const orders = [...merged.values()].sort((a, b) => {
    const ta = new Date(a.created_at ?? 0).getTime();
    const tb = new Date(b.created_at ?? 0).getTime();
    return tb - ta;
  });

  return { orders, byEmailFallback: usedEmailOnly };
}

export async function fetchAdminCustomerDetail(
  supabase: SupabaseClient,
  customerId: string,
): Promise<{ detail: AdminCustomerDetail | null; error: { message: string } | null }> {
  const { data: raw, error: cErr } = await supabase
    .from("customers")
    .select(
      "id,name,email,phone,document_id,shipping_address,shipping_city,shipping_postal_code,notes,source,created_at",
    )
    .eq("id", customerId)
    .maybeSingle();

  if (cErr) {
    return { detail: null, error: cErr };
  }

  if (!raw) {
    return { detail: null, error: null };
  }

  const customer = raw as AdminCustomerDetail["customer"];
  const emailNormalized = customer.email?.trim().toLowerCase() ?? null;

  const addrRes = await supabase
    .from("customer_addresses")
    .select("id,label,address_line,reference,sort_order")
    .eq("customer_id", customerId)
    .order("sort_order", { ascending: true });

  const addresses =
    addrRes.error || !addrRes.data ? ([] as CustomerAddressRow[]) : (addrRes.data as CustomerAddressRow[]);

  const { orders: allOrders, byEmailFallback } = await fetchOrdersForCustomer(
    supabase,
    customerId,
    emailNormalized,
  );

  const ordersPaid = allOrders.filter((o) => o.status === "paid");

  let topProducts: TopProductRow[] = [];
  if (ordersPaid.length > 0) {
    const ids = ordersPaid.map((o) => o.id);
    const { data: items } = await supabase
      .from("order_items")
      .select("product_name_snapshot,quantity")
      .in("order_id", ids);

    const map = new Map<string, number>();
    for (const it of items ?? []) {
      const name = String((it as { product_name_snapshot: string }).product_name_snapshot);
      const q = Number((it as { quantity: number }).quantity) || 0;
      map.set(name, (map.get(name) ?? 0) + q);
    }
    topProducts = [...map.entries()]
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);
  }

  return {
    detail: {
      customer,
      addresses,
      ordersPaid,
      customerOrders: allOrders,
      topProducts,
      matchedOrdersByEmailFallback: byEmailFallback,
    },
    error: null,
  };
}
