"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertActionPermission } from "@/lib/require-admin-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function assertProfile(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: prof } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!prof) redirect("/admin/login?error=no_profile");
}

function revalidateStoreCoupons() {
  revalidatePath("/");
  revalidatePath("/checkout");
  revalidatePath("/admin/coupons");
  revalidatePath("/admin/coupons/nuevo");
}

/** `YYYY-MM-DD` del calendario → inicio del día (00:00 UTC). */
function parseOptionalCouponDayStart(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)).toISOString();
  }
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

/** `YYYY-MM-DD` del calendario → fin del día inclusive (23:59:59.999 UTC). */
function parseOptionalCouponDayEnd(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999)).toISOString();
  }
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

function parseDiscountPercent(raw: string, fallback: number): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, n));
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseRestrictToProducts(formData: FormData): boolean {
  return String(formData.get("restrict_to_products") ?? "") === "on";
}

function parseCouponProductIds(formData: FormData): string[] {
  const raw = formData.getAll("coupon_product_id");
  const ids = new Set<string>();
  for (const v of raw) {
    const s = String(v ?? "").trim();
    if (UUID_RE.test(s)) ids.add(s);
  }
  return [...ids];
}

async function assertProductIdsExist(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  productIds: string[],
): Promise<boolean> {
  if (productIds.length === 0) return true;
  const { data, error } = await supabase
    .from("products")
    .select("id")
    .in("id", productIds);
  if (error || !data || data.length !== productIds.length) {
    return false;
  }
  return true;
}

async function syncStoreCouponProductLinks(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  couponId: string,
  restrict: boolean,
  productIds: string[],
): Promise<boolean> {
  const { error: delErr } = await supabase
    .from("store_coupon_products")
    .delete()
    .eq("coupon_id", couponId);
  if (delErr) return false;
  if (!restrict || productIds.length === 0) {
    return true;
  }
  const { error: insErr } = await supabase.from("store_coupon_products").insert(
    productIds.map((product_id) => ({ coupon_id: couponId, product_id })),
  );
  return !insErr;
}

export async function createStoreCoupon(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  await assertProfile(supabase);
  await assertActionPermission("marketing_ver");

  const internalLabel = String(formData.get("internal_label") ?? "").trim() || null;
  const bannerMessage = String(formData.get("banner_message") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  if (!bannerMessage) {
    redirect("/admin/coupons/nuevo?coupon_error=banner_message");
  }
  if (!code) redirect("/admin/coupons/nuevo?coupon_error=code");

  const discountPercent = parseDiscountPercent(
    String(formData.get("discount_percent") ?? ""),
    10,
  );
  const isEnabled = formData.get("is_enabled") === "on";
  const showInBanner = formData.get("show_in_banner") === "on";
  const sortRaw = String(formData.get("sort_order") ?? "").trim();
  const sortOrder =
    sortRaw.length > 0 ? Math.max(0, Math.floor(Number(sortRaw))) : 0;
  const startsAt = parseOptionalCouponDayStart(
    String(formData.get("starts_at") ?? ""),
  );
  const endsAt = parseOptionalCouponDayEnd(
    String(formData.get("ends_at") ?? ""),
  );

  const restrictToProducts = parseRestrictToProducts(formData);
  const productIds = parseCouponProductIds(formData);
  if (restrictToProducts && productIds.length === 0) {
    redirect("/admin/coupons/nuevo?coupon_error=products_required");
  }
  if (restrictToProducts && !(await assertProductIdsExist(supabase, productIds))) {
    redirect("/admin/coupons/nuevo?coupon_error=invalid_products");
  }

  const { data: inserted, error } = await supabase
    .from("store_coupons")
    .insert({
      internal_label: internalLabel,
      banner_message: bannerMessage,
      code,
      discount_percent: discountPercent,
      is_enabled: isEnabled,
      show_in_banner: showInBanner,
      sort_order: sortOrder,
      starts_at: startsAt,
      ends_at: endsAt,
    })
    .select("id")
    .single();

  if (error || !inserted?.id) {
    if (error?.code === "23505") {
      redirect("/admin/coupons/nuevo?coupon_error=duplicate_code");
    }
    redirect("/admin/coupons/nuevo?coupon_error=db");
  }

  const couponId = inserted.id as string;
  const linksOk = await syncStoreCouponProductLinks(
    supabase,
    couponId,
    restrictToProducts,
    productIds,
  );
  if (!linksOk) {
    await supabase.from("store_coupons").delete().eq("id", couponId);
    redirect("/admin/coupons/nuevo?coupon_error=db");
  }

  revalidateStoreCoupons();
  redirect("/admin/coupons");
}

export async function updateStoreCoupon(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  await assertProfile(supabase);
  await assertActionPermission("marketing_ver");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/coupons?coupon_error=id");

  const internalLabel = String(formData.get("internal_label") ?? "").trim() || null;
  const bannerMessage = String(formData.get("banner_message") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  if (!bannerMessage) {
    redirect(`/admin/coupons/${id}/edit?coupon_error=banner_message`);
  }
  if (!code) redirect(`/admin/coupons/${id}/edit?coupon_error=code`);

  const discountPercent = parseDiscountPercent(
    String(formData.get("discount_percent") ?? ""),
    10,
  );
  const isEnabled = formData.get("is_enabled") === "on";
  const showInBanner = formData.get("show_in_banner") === "on";
  const sortRaw = String(formData.get("sort_order") ?? "").trim();

  const { data: prev } = await supabase
    .from("store_coupons")
    .select("sort_order")
    .eq("id", id)
    .maybeSingle();
  const prevSort = Number(prev?.sort_order ?? 0);
  const sortOrder =
    sortRaw.length > 0
      ? Math.max(0, Math.floor(Number(sortRaw)))
      : (Number.isFinite(prevSort) ? prevSort : 0);

  const startsAt = parseOptionalCouponDayStart(
    String(formData.get("starts_at") ?? ""),
  );
  const endsAt = parseOptionalCouponDayEnd(
    String(formData.get("ends_at") ?? ""),
  );

  const restrictToProducts = parseRestrictToProducts(formData);
  const productIds = parseCouponProductIds(formData);
  if (restrictToProducts && productIds.length === 0) {
    redirect(`/admin/coupons/${id}/edit?coupon_error=products_required`);
  }
  if (restrictToProducts && !(await assertProductIdsExist(supabase, productIds))) {
    redirect(`/admin/coupons/${id}/edit?coupon_error=invalid_products`);
  }

  const { error } = await supabase
    .from("store_coupons")
    .update({
      internal_label: internalLabel,
      banner_message: bannerMessage,
      code,
      discount_percent: discountPercent,
      is_enabled: isEnabled,
      show_in_banner: showInBanner,
      sort_order: sortOrder,
      starts_at: startsAt,
      ends_at: endsAt,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      redirect(`/admin/coupons/${id}/edit?coupon_error=duplicate_code`);
    }
    redirect(`/admin/coupons/${id}/edit?coupon_error=db`);
  }

  const linksOk = await syncStoreCouponProductLinks(
    supabase,
    id,
    restrictToProducts,
    productIds,
  );
  if (!linksOk) {
    redirect(`/admin/coupons/${id}/edit?coupon_error=db`);
  }

  revalidateStoreCoupons();
  redirect("/admin/coupons");
}

export async function deleteStoreCoupon(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  await assertProfile(supabase);
  await assertActionPermission("marketing_ver");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/coupons?coupon_error=id");

  const { error } = await supabase.from("store_coupons").delete().eq("id", id);
  if (error) redirect(`/admin/coupons/${id}/edit?coupon_error=db`);

  revalidateStoreCoupons();
  redirect("/admin/coupons");
}
