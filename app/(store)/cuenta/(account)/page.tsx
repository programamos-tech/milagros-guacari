import Link from "next/link";
import { CuentaFavoritosResumenCard } from "@/components/store/CuentaFavoritosResumenCard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCop } from "@/lib/money";

export const metadata = {
  title: "Mi cuenta",
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

const cardTitle =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-900";
const cardBody = "mt-6 flex flex-1 flex-col items-center justify-center text-sm leading-relaxed text-stone-600";

export default async function CuentaResumenPage({
  searchParams,
}: {
  searchParams: Promise<{ cumple?: string }>;
}) {
  const sp = await searchParams;
  const cumpleOk = sp.cumple === "ok";

  const supabase = await createSupabaseServerClient();

  const { data: lastOrder } = await supabase
    .from("orders")
    .select("id, status, total_cents, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="space-y-10">
      {cumpleOk ? (
        <p className="rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-4 py-3 text-center text-sm font-medium text-emerald-900">
          Guardamos tu fecha de cumpleaños. ¡Gracias!
        </p>
      ) : null}
      <div className="grid gap-6 md:grid-cols-3 md:items-stretch">
        <article className="flex min-h-[15rem] flex-col border border-stone-200/90 bg-white p-6 sm:min-h-[16rem] sm:p-8">
          <h2 className={`${cardTitle} text-center`}>Pedido reciente</h2>
          <div className={cardBody}>
            {lastOrder ? (
              <div className="w-full text-center">
                <p className="text-xs text-stone-500">
                  {new Date(lastOrder.created_at).toLocaleString("es-CO", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
                <p className="mt-3 text-lg font-semibold tabular-nums text-stone-900">
                  {formatCop(lastOrder.total_cents)}
                </p>
                <p className="mt-1 text-xs text-stone-600">
                  {orderStatusLabel(lastOrder.status)}
                </p>
                <Link
                  href={`/cuenta/pedidos/${lastOrder.id}`}
                  className="mt-6 inline-block text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-900 underline decoration-stone-400 underline-offset-4 transition hover:text-stone-600"
                >
                  Ver pedido
                </Link>
              </div>
            ) : (
              <p className="text-center">
                Todavía no tienes pedidos en esta tienda.
              </p>
            )}
          </div>
        </article>

        <CuentaFavoritosResumenCard />

        <article className="flex min-h-[15rem] flex-col border border-stone-200/90 bg-white p-6 sm:min-h-[16rem] sm:p-8">
          <h2 className={`${cardTitle} text-center`}>Exclusivos</h2>
          <div className={cardBody}>
            <p className="max-w-[14rem] text-center">
              No tienes ofertas personales activas por ahora.
            </p>
            <Link
              href="/products"
              className="mt-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-900 underline decoration-stone-400 underline-offset-4 transition hover:text-stone-600"
            >
              Explorar catálogo
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
