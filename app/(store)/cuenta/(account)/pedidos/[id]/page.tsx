import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCop } from "@/lib/money";
import { formatStoreDateTime } from "@/lib/store-datetime-format";

export const metadata = {
  title: "Detalle del pedido",
};

function orderStatusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Pendiente de pago";
    case "paid":
      return "Pagado";
    case "failed":
      return "Pago fallido";
    case "cancelled":
      return "Cancelado";
    default:
      return status;
  }
}

export default async function CuentaPedidoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: order, error: oErr } = await supabase
    .from("orders")
    .select(
      "id, status, total_cents, currency, created_at, customer_name, customer_email, shipping_address, shipping_city, shipping_postal_code, shipping_phone",
    )
    .eq("id", id)
    .maybeSingle();

  if (oErr || !order) {
    notFound();
  }

  const { data: items } = await supabase
    .from("order_items")
    .select(
      "id, quantity, unit_price_cents, product_name_snapshot",
    )
    .eq("order_id", id);

  const lines = items ?? [];

  return (
    <div className="space-y-8">
      <nav aria-label="Migas de pan" className="text-sm text-stone-500">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li>
            <Link
              href="/cuenta/pedidos"
              className="hover:text-[var(--store-accent)] hover:underline"
            >
              Mis pedidos
            </Link>
          </li>
          <li aria-hidden className="text-stone-300">
            /
          </li>
          <li className="font-medium text-stone-700">Detalle</li>
        </ol>
      </nav>

      <div>
        <h1 className="text-2xl font-semibold text-stone-900">
          Pedido {order.id.slice(0, 8)}…
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          {orderStatusLabel(order.status)} ·{" "}
          {formatStoreDateTime(order.created_at, {
            dateStyle: "full",
            timeStyle: "short",
          })}
        </p>
      </div>

      <section className="rounded-xl border border-stone-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
        <h2 className="text-lg font-semibold text-stone-900">Envío</h2>
        <dl className="mt-4 space-y-2 text-sm text-stone-700">
          <div>
            <dt className="text-stone-500">Nombre</dt>
            <dd>{order.customer_name}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Email</dt>
            <dd>{order.customer_email}</dd>
          </div>
          {order.shipping_phone ? (
            <div>
              <dt className="text-stone-500">Teléfono</dt>
              <dd>{order.shipping_phone}</dd>
            </div>
          ) : null}
          {order.shipping_address ? (
            <div>
              <dt className="text-stone-500">Dirección</dt>
              <dd>
                {order.shipping_address}
                {order.shipping_city
                  ? `, ${order.shipping_city}`
                  : ""}
                {order.shipping_postal_code
                  ? ` · ${order.shipping_postal_code}`
                  : ""}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="rounded-xl border border-stone-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
        <h2 className="text-lg font-semibold text-stone-900">Productos</h2>
        <ul className="mt-4 divide-y divide-stone-100">
          {lines.map((line) => (
            <li
              key={line.id}
              className="flex justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div>
                <p className="font-medium text-stone-900">
                  {line.product_name_snapshot}
                </p>
                <p className="text-sm text-stone-500">
                  {line.quantity}{" "}
                  {line.quantity === 1 ? "unidad" : "unidades"} ×{" "}
                  {formatCop(line.unit_price_cents)}
                </p>
              </div>
              <p className="shrink-0 font-semibold text-stone-900">
                {formatCop(line.unit_price_cents * line.quantity)}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-stone-100 pt-4 text-base font-bold text-stone-900">
          <span>Total</span>
          <span>{formatCop(order.total_cents)}</span>
        </div>
      </section>
    </div>
  );
}
