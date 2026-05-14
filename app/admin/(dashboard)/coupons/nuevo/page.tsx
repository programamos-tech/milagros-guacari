import {
  NewCouponForm,
  NewCouponHeader,
} from "@/components/admin/StoreCouponForms";
import { storeCouponAdminErrorMessage } from "@/lib/store-coupons";

export const dynamic = "force-dynamic";

export default async function AdminNuevoCuponPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const couponError =
    typeof sp.coupon_error === "string" ? sp.coupon_error : undefined;
  const errMsg = storeCouponAdminErrorMessage(couponError);

  return (
    <div className="w-full min-w-0">
      <NewCouponHeader />
      {errMsg ? (
        <p
          className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100"
          role="alert"
        >
          {errMsg}
        </p>
      ) : null}
      <NewCouponForm />
    </div>
  );
}
