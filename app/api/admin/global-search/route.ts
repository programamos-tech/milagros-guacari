import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-api";
import { ventaNumeroReferencia } from "@/lib/ventas-sales";

function sanitizeIlikeQuery(q: string) {
  return q.replace(/[%_\\,]/g, "").slice(0, 80);
}

type OrderRow = {
  id: string;
  status: string;
  customer_name: string;
  total_cents: number;
  created_at: string;
  wompi_reference: string | null;
  checkout_payment_method?: string | null;
};

function orderMatchesQuery(o: OrderRow, qRaw: string, qCompact: string): boolean {
  const id = String(o.id);
  const idC = id.replace(/-/g, "").toLowerCase();
  const ref = ventaNumeroReferencia(id);
  const digits = qRaw.replace(/\D/g, "");
  if (idC.includes(qCompact)) return true;
  if (digits.length >= 2 && ref.includes(digits)) return true;
  return false;
}

export async function GET(request: Request) {
  const gate = await requireAdminApiSession();
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("q")?.trim() ?? "";
  if (raw.length < 1) {
    return NextResponse.json({
      products: [],
      customers: [],
      orders: [],
    });
  }

  const q = sanitizeIlikeQuery(raw);
  if (q.length < 1) {
    return NextResponse.json({
      products: [],
      customers: [],
      orders: [],
    });
  }

  const pattern = `%${q}%`;
  const qCompact = q.replace(/-/g, "").toLowerCase();
  const qDigits = q.replace(/\D/g, "");
  const { supabase } = gate;

  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const orderSelect =
    "id,status,customer_name,total_cents,created_at,wompi_reference,checkout_payment_method" as const;

  const canSearchIdFragment =
    qCompact.length >= 6 && /^[0-9a-f-]+$/i.test(qCompact);
  const needsInvoiceRefScan =
    qDigits.length >= 2 && qDigits.length <= 6 && !canSearchIdFragment;

  const orderLookups: PromiseLike<{
    data: OrderRow[] | OrderRow | null;
    error: { message: string } | null;
  }>[] = [
    supabase
      .from("orders")
      .select(orderSelect)
      .or(`customer_name.ilike.${pattern},customer_email.ilike.${pattern}`)
      .order("created_at", { ascending: false })
      .limit(12),
  ];

  if (uuidRe.test(q)) {
    orderLookups.push(
      supabase.from("orders").select(orderSelect).eq("id", q).maybeSingle(),
    );
  } else if (canSearchIdFragment) {
    orderLookups.push(
      supabase
        .from("orders")
        .select(orderSelect)
        .ilike("id", `%${qCompact}%`)
        .order("created_at", { ascending: false })
        .limit(12),
    );
  } else if (needsInvoiceRefScan) {
    orderLookups.push(
      supabase
        .from("orders")
        .select(orderSelect)
        .order("created_at", { ascending: false })
        .limit(64),
    );
  }

  const [productsRes, customersRes, ...orderResults] = await Promise.all([
    supabase
      .from("products")
      .select("id,name,reference,price_cents,stock_quantity,stock_local,has_vat,vat_percent")
      .or(`name.ilike.${pattern},reference.ilike.${pattern}`)
      .order("name")
      .limit(8),
    supabase
      .from("customers")
      .select("id,name,email,phone,document_id")
      .or(
        `name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern},document_id.ilike.${pattern}`,
      )
      .order("name")
      .limit(8),
    ...orderLookups,
  ]);

  if (productsRes.error) {
    return NextResponse.json({ error: productsRes.error.message }, { status: 500 });
  }
  if (customersRes.error) {
    return NextResponse.json({ error: customersRes.error.message }, { status: 500 });
  }

  const orderMap = new Map<string, OrderRow>();
  const pushOrder = (row: OrderRow | null | undefined) => {
    if (row?.id) orderMap.set(row.id, row);
  };

  for (const res of orderResults) {
    if (res.error) {
      return NextResponse.json({ error: res.error.message }, { status: 500 });
    }
    const data = res.data;
    if (Array.isArray(data)) {
      for (const o of data) {
        if (needsInvoiceRefScan) {
          if (orderMatchesQuery(o as OrderRow, q, qCompact)) {
            pushOrder(o as OrderRow);
          }
        } else {
          pushOrder(o as OrderRow);
        }
      }
    } else {
      pushOrder(data as OrderRow | null);
    }
  }

  const orders = [...orderMap.values()]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 12)
    .map((o) => ({
      ...o,
      invoiceRef: ventaNumeroReferencia(o.id),
    }));

  return NextResponse.json({
    products: productsRes.data ?? [],
    customers: customersRes.data ?? [],
    orders,
  });
}
