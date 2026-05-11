import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminUpdateStockForm } from "@/components/admin/AdminUpdateStockForm";
import { adjustProductStock } from "@/app/actions/admin/products";
import { requireAdminPermission } from "@/lib/require-admin-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function shortSku(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function breadcrumbSegment(name: string) {
  const t = name.trim();
  if (t.length <= 40) return t;
  return `${t.slice(0, 39)}…`;
}

export default async function AdminProductStockPage({ params }: Props) {
  await requireAdminPermission("stock_actualizar");
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: product } = await supabase.from("products").select("*").eq("id", id).maybeSingle();

  if (!product) notFound();

  const p = product as Record<string, unknown> & {
    name: string;
    reference?: string;
    stock_local?: number;
    stock_warehouse?: number;
  };

  const referenceLabel =
    (p.reference && String(p.reference).trim()) || shortSku(id);
  const stockLocal = Math.max(0, Math.floor(Number(p.stock_local ?? 0)));
  const stockWarehouse = Math.max(0, Math.floor(Number(p.stock_warehouse ?? 0)));

  const boundAdjust = adjustProductStock.bind(null, id);

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
              {breadcrumbSegment(p.name)}
            </Link>
            <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">/</span>
            <span className="text-zinc-700 dark:text-zinc-300">Actualizar stock</span>
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            Actualizar stock
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            Registra entradas de stock (compras / te llegó mercancía) o ajustes por conteo (corrección
            después de contar).
          </p>
        </div>
        <Link
          href={`/admin/products/${id}`}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200/90 bg-white text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          aria-label="Volver al producto"
        >
          <span className="text-lg leading-none" aria-hidden>
            ←
          </span>
        </Link>
      </div>

      <AdminUpdateStockForm
        productName={p.name}
        referenceLabel={referenceLabel}
        stockLocal={stockLocal}
        stockWarehouse={stockWarehouse}
        formAction={boundAdjust}
        returnTo={`/admin/products/${id}`}
      />
    </div>
  );
}
