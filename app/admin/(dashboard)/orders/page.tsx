import Link from "next/link";
import { VentasPagination } from "@/components/admin/VentasPagination";
import { formatStoreDateTime } from "@/lib/store-datetime-format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCop } from "@/lib/money";

export const dynamic = "force-dynamic";

const ORDERS_PAGE_SIZE = 25;

const statusLabel: Record<string, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  failed: "Fallido",
  cancelled: "Cancelado",
};

function searchParamFirst(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const pageRaw = searchParamFirst(sp.page);
  const pageParsed = pageRaw ? Number.parseInt(pageRaw, 10) : 1;
  const page = Number.isFinite(pageParsed) && pageParsed > 0 ? pageParsed : 1;

  const from = (page - 1) * ORDERS_PAGE_SIZE;
  const to = from + ORDERS_PAGE_SIZE - 1;

  const supabase = await createSupabaseServerClient();
  const { data: orders, count } = await supabase
    .from("orders")
    .select("id,status,customer_name,total_cents,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  const list = orders ?? [];
  const total = count ?? 0;

  const buildPageHref = (targetPage: number) =>
    targetPage > 1 ? `/admin/orders?page=${targetPage}` : "/admin/orders";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-stone-900 sm:text-3xl">
        Pedidos
      </h1>
      {list.length === 0 ? (
        <p className="text-stone-600">Todavía no hay pedidos.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white ring-1 ring-stone-100">
          <ul className="divide-y divide-stone-100">
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
                      {formatStoreDateTime(String(o.created_at), {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
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
          <VentasPagination
            page={page}
            pageSize={ORDERS_PAGE_SIZE}
            total={total}
            buildHref={buildPageHref}
          />
        </div>
      )}
    </div>
  );
}
