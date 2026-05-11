import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminTransferStockForm } from "@/components/admin/AdminTransferStockForm";
import { transferProductStock } from "@/app/actions/admin/products";
import { requireAdminPermission } from "@/lib/require-admin-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function breadcrumbProduct(name: string) {
  const t = name.trim();
  if (t.length <= 40) return t;
  return `${t.slice(0, 39)}…`;
}

export default async function AdminTransferStockPage({ params, searchParams }: Props) {
  await requireAdminPermission("stock_transferir");
  const { id } = await params;
  const sp = await searchParams;
  const err = sp.error === "transfer";

  const supabase = await createSupabaseServerClient();
  const { data: product } = await supabase.from("products").select("*").eq("id", id).maybeSingle();

  if (!product) notFound();

  const p = product as Record<string, unknown> & { name: string };
  const stockLocal = Math.max(0, Math.floor(Number(p.stock_local ?? 0)));
  const stockWarehouse = Math.max(0, Math.floor(Number(p.stock_warehouse ?? 0)));

  const boundTransfer = transferProductStock.bind(null, id);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <Link href="/admin/products" className="hover:text-zinc-800 dark:hover:text-zinc-200">
              Inventario
            </Link>
            <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">/</span>
            <Link
              href={`/admin/products/${id}`}
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
              title={p.name}
            >
              {breadcrumbProduct(p.name)}
            </Link>
            <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">/</span>
            <span className="text-zinc-700 dark:text-zinc-300">Transferir stock</span>
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            Transferir stock
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            Mové unidades entre el local (punto de venta) y la bodega de la sucursal activa.
          </p>
          {err ? (
            <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100">
              No se pudo transferir. Verifica que la cantidad sea mayor que cero y no supere el stock en
              el origen.
            </p>
          ) : null}
        </div>
        <Link
          href={`/admin/products/${id}`}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200/90 bg-white text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          aria-label="Volver"
        >
          <span className="text-lg leading-none" aria-hidden>
            ←
          </span>
        </Link>
      </div>

      <AdminTransferStockForm
        productName={p.name}
        stockLocal={stockLocal}
        stockWarehouse={stockWarehouse}
        formAction={boundTransfer}
        returnTo={`/admin/products/${id}`}
      />
    </div>
  );
}
