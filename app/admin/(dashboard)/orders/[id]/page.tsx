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

  const [{ data: order }, { data: itemsRaw }] = await Promise.all([
    supabase.from("orders").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("order_items")
      .select(
        "id, quantity, unit_price_cents, product_name_snapshot, product_id, line_discount_percent, line_discount_amount_cents, products(reference)",
      )
      .eq("order_id", id),
  ]);

  if (!order) notFound();

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

  const customerId =
    order.customer_id != null && String(order.customer_id).trim().length > 0
      ? String(order.customer_id)
      : null;

  const checkoutPm =
    "checkout_payment_method" in order && order.checkout_payment_method != null
      ? String(order.checkout_payment_method)
      : null;

  const needsTransferProofs =
    String(order.status) === "pending" && checkoutPm === "transfer";

  const [customerRes, proofsRes] = await Promise.all([
    customerId
      ? supabase
          .from("customers")
          .select("phone,document_id,shipping_address,shipping_city")
          .eq("id", customerId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    needsTransferProofs
      ? supabase
          .from("order_transfer_proofs")
          .select("storage_path, original_filename, created_at")
          .eq("order_id", id)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as { storage_path: string; original_filename: string | null; created_at: string }[] }),
  ]);

  let customerDocumentId: string | null = null;
  let customerPhoneFromProfile: string | null = null;
  let customerAddressFromProfile: string | null = null;

  const cust = customerRes.data;
  if (cust) {
    const doc = cust.document_id != null ? String(cust.document_id).trim() : "";
    if (doc.length > 0) customerDocumentId = doc;
    const phone = cust.phone != null ? String(cust.phone).trim() : "";
    if (phone.length > 0) customerPhoneFromProfile = phone;
    const addrParts = [cust.shipping_city, cust.shipping_address]
      .map((v) => (v != null ? String(v).trim() : ""))
      .filter((v) => v.length > 0);
    if (addrParts.length > 0) customerAddressFromProfile = addrParts.join(" · ");
  }

  const orderShippingPhone =
    order.shipping_phone != null ? String(order.shipping_phone).trim() : "";
  const orderShippingAddress =
    order.shipping_address != null ? String(order.shipping_address).trim() : "";
  const orderShippingCity =
    order.shipping_city != null ? String(order.shipping_city).trim() : "";
  const orderAddressLine = [orderShippingCity, orderShippingAddress]
    .filter((v) => v.length > 0)
    .join(" · ");
  const customerAddress =
    orderAddressLine.length > 0 ? orderAddressLine : customerAddressFromProfile;
  const customerPhone =
    orderShippingPhone.length > 0 ? orderShippingPhone : customerPhoneFromProfile;

  let transferProofAttachments: {
    signedUrl: string;
    createdAt: string;
    filename: string | null;
  }[] = [];

  if (needsTransferProofs) {
    const bucket = supabase.storage.from("order-payment-proofs");
    const rows = proofsRes.data ?? [];
    transferProofAttachments = (
      await Promise.all(
        rows.map(async (row) => {
          const path = String(row.storage_path);
          const signed = await bucket.createSignedUrl(path, 3600);
          if (signed.error || !signed.data?.signedUrl) return null;
          return {
            signedUrl: signed.data.signedUrl,
            createdAt: String(row.created_at),
            filename:
              row.original_filename != null ? String(row.original_filename) : null,
          };
        }),
      )
    ).filter((x): x is NonNullable<typeof x> => x != null);
  }

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
        customerDocumentId={customerDocumentId}
        customerPhone={customerPhone}
        customerAddress={customerAddress}
        shippingPhone={
          order.shipping_phone != null ? String(order.shipping_phone) : null
        }
        cancellationReason={
          order.cancellation_reason != null
            ? String(order.cancellation_reason)
            : null
        }
        lines={lines}
        transferProofAttachments={transferProofAttachments}
        checkoutPaymentMethod={checkoutPm}
        ventasListHref={ventasListHref}
      />
    </div>
  );
}
