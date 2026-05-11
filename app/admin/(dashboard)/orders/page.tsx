import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCop } from "@/lib/money";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  failed: "Fallido",
  cancelled: "Cancelado",
};

export default async function AdminOrdersPage() {
  const supabase = await createSupabaseServerClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id,status,customer_name,total_cents,created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const list = orders ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-stone-900 sm:text-3xl">
        Pedidos
      </h1>
      {list.length === 0 ? (
        <p className="text-stone-600">Todavía no hay pedidos.</p>
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200/80 bg-white ring-1 ring-stone-100">
          {list.map((o) => (
            <li key={o.id}>
              <Link
                href={`/admin/orders/${o.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition hover:bg-zinc-50"
              >
                <div>
                  <p className="font-mono text-xs text-stone-500">{o.id}</p>
                  <p className="font-medium text-stone-900">{o.customer_name}</p>
                  <p className="text-xs text-stone-500">
                    {new Date(o.created_at as string).toLocaleString("es-CO")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-stone-900">
                    {formatCop(o.total_cents as number)}
                  </p>
                  <p className="text-sm text-stone-600">
                    {statusLabel[String(o.status)] ?? o.status}
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
