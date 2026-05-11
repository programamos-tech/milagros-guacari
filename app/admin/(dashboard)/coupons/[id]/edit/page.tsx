import { notFound } from "next/navigation";
import type { CouponProductPickerHit } from "@/components/admin/CouponProductPicker";
import {
  EditCouponForm,
  EditCouponHeader,
} from "@/components/admin/StoreCouponForms";
import type { StoreCouponRow } from "@/lib/store-coupons";
import { storeCouponAdminErrorMessage } from "@/lib/store-coupons";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminEditCouponPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const couponError =
    typeof sp.coupon_error === "string" ? sp.coupon_error : undefined;
  const errMsg = storeCouponAdminErrorMessage(couponError);

  const supabase = await createSupabaseServerClient();
  const { data: row, error } = await supabase
    .from("store_coupons")
    .select(
      "id, internal_label, banner_message, code, discount_percent, is_enabled, show_in_banner, sort_order, starts_at, ends_at, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !row) {
    notFound();
  }

  const coupon = row as StoreCouponRow;

  const { data: linkRows } = await supabase
    .from("store_coupon_products")
    .select("product_id")
    .eq("coupon_id", id);

  const pids = [
    ...new Set((linkRows ?? []).map((r) => String(r.product_id))),
  ];

  let linkedProducts: CouponProductPickerHit[] = [];
  if (pids.length > 0) {
    const { data: prods } = await supabase
      .from("products")
      .select("id,name,reference")
      .in("id", pids);
    linkedProducts = (prods ?? []) as CouponProductPickerHit[];
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl">
      <EditCouponHeader row={coupon} />
      {errMsg ? (
        <p
          className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100"
          role="alert"
        >
          {errMsg}
        </p>
      ) : null}
      <EditCouponForm key={coupon.id} row={coupon} linkedProducts={linkedProducts} />
    </div>
  );
}
