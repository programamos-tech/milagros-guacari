import Link from "next/link";
import { StoreCouponsTable } from "@/components/admin/StoreCouponsTable";
import type { StoreCouponRow } from "@/lib/store-coupons";
import { storeCouponAdminErrorMessage } from "@/lib/store-coupons";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const couponError =
    typeof sp.coupon_error === "string" ? sp.coupon_error : undefined;
  const errMsg = storeCouponAdminErrorMessage(couponError);

  const supabase = await createSupabaseServerClient();
  const { data: coupons } = await supabase
    .from("store_coupons")
    .select(
      "id, internal_label, banner_message, code, discount_percent, is_enabled, show_in_banner, sort_order, starts_at, ends_at, created_at, updated_at",
    )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const rows = (coupons ?? []) as StoreCouponRow[];
  const couponIds = rows.map((r) => r.id);
  const restrictedCountById = new Map<string, number>();
  if (couponIds.length > 0) {
    const { data: linkRows } = await supabase
      .from("store_coupon_products")
      .select("coupon_id")
      .in("coupon_id", couponIds);
    for (const lr of linkRows ?? []) {
      const cid = String(lr.coupon_id);
      restrictedCountById.set(cid, (restrictedCountById.get(cid) ?? 0) + 1);
    }
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <Link href="/admin" className="hover:text-zinc-800 dark:hover:text-zinc-200">
              Reportes
            </Link>
            <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">/</span>
            <span className="text-zinc-700 dark:text-zinc-300">Cupones</span>
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl md:text-3xl">
            Cupones y franja promocional
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            El cupón con menor orden y vigencia activa aparece arriba en la tienda si está marcado
            para franja. El mismo código aplica el porcentaje configurado en el checkout.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/coupons/nuevo"
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            + Nuevo cupón
          </Link>
        </div>
      </div>

      {errMsg ? (
        <p
          className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100"
          role="alert"
        >
          {errMsg}
        </p>
      ) : null}

      <StoreCouponsTable
        rows={rows}
        restrictedProductCountById={restrictedCountById}
      />
    </div>
  );
}
