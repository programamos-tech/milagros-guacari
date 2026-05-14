import { notFound } from "next/navigation";
import { OrderInvoiceDetailView } from "@/components/admin/OrderInvoiceDetailView";
import { safeAdminVentasListReturnPath } from "@/lib/admin-ventas-list-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ventaNumeroReferencia } from "@/lib/ventas-sales";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ItemRow = {
  id: string;
  quantity: number;
  unit_price_cents: number;
  product_name_snapshot: string;
  product_id: string | null;
  line_discount_percent: number | null;
  line_discount_amount_cents: number | null;
  products: { reference: string } | { reference: string }[] | null;
};

function productRefFromRow(row: ItemRow): string | null {
  const raw = row.products;
  const p = Array.isArray(raw) ? raw[0] : raw;
  if (!p || typeof p !== "object") return null;
  const ref = "reference" in p && typeof p.reference === "string" ? p.reference.trim() : "";
  return ref.length > 0 ? ref : null;
}

export default async function AdminOrderDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const ventasListHref = safeAdminVentasListReturnPath(sp.returnTo);
  const supabase = await createSupabaseServerClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!order) notFound();

  const { data: itemsRaw } = await supabase
    .from("order_items")
    .select(
      "id, quantity, unit_price_cents, product_name_snapshot, product_id, line_discount_percent, line_discount_amount_cents, products(reference)",
    )
    .eq("order_id", id);

  const items = (itemsRaw ?? []) as unknown as ItemRow[];

  const lines = items.map((it) => ({
    id: String(it.id),
    name: String(it.product_name_snapshot ?? "Producto"),
    reference: productRefFromRow(it),
    quantity: Number(it.quantity ?? 0),
    unitPriceCents: Number(it.unit_price_cents ?? 0),
    lineDiscountPercent:
      it.line_discount_percent != null && Number(it.line_discount_percent) > 0
        ? Number(it.line_discount_percent)
        : null,
    lineDiscountAmountCents: Math.max(0, Number(it.line_discount_amount_cents ?? 0)),
  }));

  const invoiceRef = ventaNumeroReferencia(id);

  return (
    <div className="-mx-3 w-[calc(100%+1.5rem)] max-w-none bg-zinc-50/70 py-6 dark:bg-zinc-950/80 sm:-mx-4 sm:w-[calc(100%+2rem)] md:-mx-6 md:w-[calc(100%+3rem)] print:mx-0 print:w-auto print:bg-transparent print:py-0 print:p-0">
      <OrderInvoiceDetailView
        orderId={id}
        invoiceRef={invoiceRef}
        status={String(order.status)}
        customerName={String(order.customer_name ?? "")}
        customerEmail={String(order.customer_email ?? "")}
        totalCents={Number(order.total_cents ?? 0)}
        createdAt={String(order.created_at)}
        wompiReference={
          order.wompi_reference != null ? String(order.wompi_reference) : null
        }
        shippingAddress={
          order.shipping_address != null ? String(order.shipping_address) : null
        }
        shippingCity={
          order.shipping_city != null ? String(order.shipping_city) : null
        }
        shippingPhone={
          order.shipping_phone != null ? String(order.shipping_phone) : null
        }
        cancellationReason={
          order.cancellation_reason != null
            ? String(order.cancellation_reason)
            : null
        }
        lines={lines}
        ventasListHref={ventasListHref}
      />
    </div>
  );
}
