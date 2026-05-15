import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { fetchStorefrontCouponDiscountPercentByProductId } from "@/lib/store-coupons";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_IDS = 48;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("ids")?.trim() ?? "";
  if (!raw) {
    return NextResponse.json({ products: [] });
  }

  const candidates = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const unique = [...new Set(candidates)];
  const ids = unique.filter((id) => UUID_RE.test(id)).slice(0, MAX_IDS);

  if (ids.length === 0) {
    return NextResponse.json({ products: [] });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: "Missing Supabase env" },
      { status: 500 },
    );
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("products")
    .select(
      "id,name,brand,description,price_cents,has_vat,image_path,stock_quantity,size_options,size_value,size_unit,fragrance_options",
    )
    .eq("is_published", true)
    .in("id", ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const byId = new Map((data ?? []).map((p) => [p.id as string, p]));
  const couponPctByProductId =
    await fetchStorefrontCouponDiscountPercentByProductId(supabase);
  const products = ids
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => p != null)
    .map((p) => ({
      ...p,
      coupon_discount_percent: couponPctByProductId[p.id as string] ?? 0,
    }));

  return NextResponse.json({ products });
}
