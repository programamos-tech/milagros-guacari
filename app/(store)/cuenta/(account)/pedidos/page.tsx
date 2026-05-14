import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCop } from "@/lib/money";
import { formatStoreDateTime } from "@/lib/store-datetime-format";

export const metadata = {
  title: "Mis pedidos",
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

export default async function CuentaPedidosPage() {
  const supabase = await createSupabaseServerClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, total_cents, created_at, customer_name")
    .order("created_at", { ascending: false });

  const list = orders ?? [];

  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
          Pedidos
        </p>
        <h1 className="mt-2 text-xl font-semibold uppercase tracking-[0.08em] text-[var(--store-brand)] sm:text-2xl">
          Historial de compras
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Todos los pedidos vinculados a tu cuenta en esta tienda.
        </p>
      </header>

      {list.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-200 bg-[var(--store-chrome-bg)] px-4 py-8 text-center text-sm text-stone-600">
          Todavía no tienes pedidos.{" "}
          <Link
            href="/products"
            className="font-medium text-[var(--store-accent)] underline underline-offset-4 hover:text-[var(--store-accent-hover)]"
          >
            Ver productos
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          {list.map((o) => (
            <li key={o.id}>
              <Link
                href={`/cuenta/pedidos/${o.id}`}
                className="flex flex-col gap-2 px-4 py-4 transition hover:bg-stone-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-stone-900">
                    Pedido{" "}
                    <span className="font-mono text-sm text-stone-600">
                      {String(o.id).slice(0, 8)}…
                    </span>
                  </p>
                  <p className="text-sm text-stone-500">
                    {formatStoreDateTime(o.created_at, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-semibold text-stone-900">
                    {formatCop(o.total_cents)}
                  </p>
                  <p className="text-sm text-stone-600">
                    {orderStatusLabel(o.status)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
