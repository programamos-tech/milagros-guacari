import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { formatCop } from "@/lib/money";

export const dynamic = "force-dynamic";

const labels: Record<string, string> = {
  pending: "Pendiente de pago",
  paid: "Pagado",
  failed: "Pago rechazado o fallido",
  cancelled: "Cancelado",
};

export default async function CheckoutReturnPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const orderId =
    typeof sp.order_id === "string" ? sp.order_id : undefined;
  const testCheckoutRaw = sp.test_checkout;
  const testCheckout =
    testCheckoutRaw === "1" ||
    testCheckoutRaw === "true" ||
    (Array.isArray(testCheckoutRaw) &&
      (testCheckoutRaw[0] === "1" || testCheckoutRaw[0] === "true"));

  if (!orderId) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-10">
        <h1 className="text-2xl font-semibold text-stone-900">Resultado del pago</h1>
        <p className="text-stone-600">
          Falta el identificador del pedido en la URL.
        </p>
        <Link
          href="/products"
          className="font-medium text-[var(--store-accent)] underline"
        >
          Ir al catálogo
        </Link>
      </div>
    );
  }

  const sessionSb = await createSupabaseServerClient();
  const {
    data: { user: returnUser },
  } = await sessionSb.auth.getUser();

  if (returnUser) {
    const { data: adminProf } = await sessionSb
      .from("profiles")
      .select("id")
      .eq("id", returnUser.id)
      .maybeSingle();

    if (!adminProf) {
      const { data: ownOrder } = await sessionSb
        .from("orders")
        .select("id")
        .eq("id", orderId)
        .maybeSingle();

      if (ownOrder?.id) {
        redirect(`/cuenta/pedidos/${orderId}`);
      }
    }
  }

  const supabase = createSupabaseServiceClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id,status,customer_name,customer_email,total_cents,currency")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-10">
        <h1 className="text-2xl font-semibold text-stone-900">Pedido no encontrado</h1>
        <Link
          href="/products"
          className="font-medium text-[var(--store-accent)] underline"
        >
          Ir al catálogo
        </Link>
      </div>
    );
  }

  const status = order.status as string;

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-10">
      <h1 className="text-2xl font-semibold text-stone-900">
        Resultado del pago
      </h1>
      {testCheckout ? (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <strong className="font-semibold">Modo prueba:</strong> no se llamó a
          Wompi (falta <code className="rounded bg-amber-100/80 px-1">WOMPI_PRIVATE_KEY</code>{" "}
          en local o tienes <code className="rounded bg-amber-100/80 px-1">CHECKOUT_SKIP_WOMPI</code>
          ). El pedido quedó registrado como pendiente; en{" "}
          <strong>Administración → Ventas</strong> deberías verlo. El stock no
          se descuenta hasta que el cobro quede pagado (webhook o POS).
        </div>
      ) : null}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm ring-1 ring-stone-100">
        <p className="text-sm text-stone-500">Pedido</p>
        <p className="font-mono text-sm text-stone-800">{order.id}</p>
        <p className="mt-4 text-sm text-stone-500">Estado</p>
        <p className="text-lg font-medium text-stone-900">{labels[status] ?? status}</p>
        <p className="mt-4 text-sm text-stone-500">Total</p>
        <p className="text-lg font-semibold text-[var(--store-accent)]">
          {formatCop(order.total_cents)}
        </p>
        <p className="mt-4 text-sm text-stone-600">
          {order.customer_name} · {order.customer_email}
        </p>
        <p className="mt-4 text-xs text-stone-500">
          {testCheckout
            ? "Cuando configures Wompi, el flujo normal abrirá el checkout y el webhook actualizará el estado."
            : "El estado final lo confirma Wompi por webhook; si ves “Pendiente”, espera unos segundos y refresca."}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/cuenta/pedidos"
          className="inline-flex rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-[var(--store-accent)] shadow-sm hover:bg-stone-50"
        >
          Mis pedidos
        </Link>
        <Link
          href="/products"
          className="inline-flex rounded-full bg-[var(--store-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--store-accent-hover)]"
        >
          Seguir comprando
        </Link>
      </div>
    </div>
  );
}
