"use server";

import { getCart, normalizeCartForCheckout, setCart } from "@/lib/cart";
import { storeBrand } from "@/lib/brand";
import { ensureStoreCustomerLinked } from "@/lib/store-customer-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  createPaymentLink,
  getWompiEnv,
  shouldSkipWompiPayment,
} from "@/lib/wompi";
import {
  wholesaleDiscountPercentFromRow,
} from "@/lib/customer-wholesale-pricing";
import { storefrontPayableUnitGrossCents } from "@/lib/storefront-gross-price";
import { findActiveStoreCouponForCheckout } from "@/lib/store-coupons";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function startCheckout(formData: FormData) {
  const customerEmail = String(formData.get("email") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const customerName = `${firstName} ${lastName}`.trim();
  const legacyName = String(formData.get("name") ?? "").trim();
  const resolvedName = customerName || legacyName;

  const shippingAddress = String(formData.get("address") ?? "").trim();
  const shippingCity = String(formData.get("city") ?? "").trim();
  const shippingPostalCode = String(formData.get("zipCode") ?? "").trim();
  const shippingPhone = String(formData.get("mobile") ?? "").trim();
  const couponCode = String(formData.get("couponCode") ?? "").trim();
  const paymentMethodRaw = String(formData.get("paymentMethod") ?? "wompi").trim();
  const useTransfer = paymentMethodRaw === "transfer";

  if (!resolvedName) {
    redirect("/checkout?error=missing_name");
  }
  if (!shippingAddress || !shippingCity || !shippingPhone) {
    redirect("/checkout?error=missing_shipping");
  }

  const sessionSb = await createSupabaseServerClient();
  const {
    data: { user: sessionUser },
  } = await sessionSb.auth.getUser();

  let customerEmailForOrder = customerEmail;

  if (sessionUser?.email) {
    const { data: adminProf } = await sessionSb
      .from("profiles")
      .select("id")
      .eq("id", sessionUser.id)
      .maybeSingle();

    if (!adminProf) {
      const sessionMeta = sessionUser.user_metadata as
        | { document_id?: string }
        | undefined;
      const linked = await ensureStoreCustomerLinked(
        sessionUser.id,
        sessionUser.email,
        resolvedName,
        sessionMeta?.document_id ?? null,
      );
      if (!linked) {
        redirect("/checkout?error=account_link");
      }
      customerEmailForOrder = sessionUser.email;
    }
  }

  if (!isEmail(customerEmailForOrder)) {
    redirect("/checkout?error=invalid_email");
  }

  const cart = await getCart();
  if (!cart.length) {
    redirect("/checkout?error=empty");
  }

  const supabase = createSupabaseServiceClient();
  const ids = [...new Set(cart.map((l) => l.productId))];
  const { data: products, error: pErr } = await supabase
    .from("products")
    .select("id,name,price_cents,currency,stock_quantity,is_published,has_vat,vat_percent")
    .in("id", ids);

  if (pErr) {
    if (process.env.NODE_ENV === "development") {
      console.error("[checkout] products query:", pErr.message);
    }
    redirect("/checkout?error=products");
  }

  const byId = new Map(products.map((p) => [p.id, p]));
  const normalized = normalizeCartForCheckout(cart, byId);

  if (JSON.stringify(cart) !== JSON.stringify(normalized)) {
    await setCart(normalized);
  }

  if (!normalized.length) {
    redirect("/checkout?error=empty");
  }

  const emailLc = customerEmailForOrder.toLowerCase();

  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id,customer_kind,wholesale_discount_percent")
    .eq("email", emailLc)
    .maybeSingle();

  const wholesalePct = existingCustomer
    ? wholesaleDiscountPercentFromRow(
        existingCustomer as {
          customer_kind?: string | null;
          wholesale_discount_percent?: number | null;
        },
      )
    : 0;

  let total = 0;
  const lines: {
    product_id: string;
    quantity: number;
    unit_price_cents: number;
    product_name_snapshot: string;
  }[] = [];

  for (const line of normalized) {
    const p = byId.get(line.productId);
    if (!p) {
      redirect("/checkout?error=removed");
    }
    const unit = storefrontPayableUnitGrossCents(
      p.price_cents,
      p.has_vat,
      wholesalePct,
    );
    const sub = unit * line.quantity;
    total += sub;
    const frag = line.fragrance?.trim();
    lines.push({
      product_id: p.id,
      quantity: line.quantity,
      unit_price_cents: unit,
      product_name_snapshot: frag ? `${p.name} (${frag})` : p.name,
    });
  }

  let discount = 0;
  if (couponCode) {
    const couponMatch = await findActiveStoreCouponForCheckout(
      supabase,
      couponCode,
    );
    if (!couponMatch) {
      redirect("/checkout?error=coupon_invalid");
    }
    const eligible =
      couponMatch.eligible_product_ids === null
        ? total
        : normalized.reduce((sum, line) => {
            if (!couponMatch.eligible_product_ids!.has(line.productId)) {
              return sum;
            }
            const p = byId.get(line.productId);
            if (!p) return sum;
            const unit = storefrontPayableUnitGrossCents(
              p.price_cents,
              p.has_vat,
              wholesalePct,
            );
            return sum + unit * line.quantity;
          }, 0);
    if (
      couponMatch.eligible_product_ids !== null &&
      couponMatch.eligible_product_ids.size > 0 &&
      eligible <= 0
    ) {
      redirect("/checkout?error=coupon_no_eligible_items");
    }
    discount = Math.max(
      0,
      Math.round((eligible * couponMatch.discount_percent) / 100),
    );
  }
  const totalWithDiscount = Math.max(0, total - discount);

  const first = byId.get(normalized[0]!.productId);
  const currency = first?.currency ?? "COP";

  let customerId: string;

  if (existingCustomer?.id) {
    customerId = existingCustomer.id as string;
    await supabase
      .from("customers")
      .update({
        name: resolvedName,
        phone: shippingPhone,
        shipping_address: shippingAddress,
        shipping_city: shippingCity,
        shipping_postal_code: shippingPostalCode || null,
      })
      .eq("id", customerId);
  } else {
    const { data: insertedCustomer, error: cErr } = await supabase
      .from("customers")
      .insert({
        name: resolvedName,
        email: emailLc,
        phone: shippingPhone,
        shipping_address: shippingAddress,
        shipping_city: shippingCity,
        shipping_postal_code: shippingPostalCode || null,
        source: "storefront",
      })
      .select("id")
      .single();

    if (cErr || !insertedCustomer) {
      redirect("/checkout?error=order");
    }
    customerId = insertedCustomer.id as string;
  }

  const transferSessionToken = useTransfer ? randomUUID() : null;

  const { data: orderRow, error: oErr } = await supabase
    .from("orders")
    .insert({
      customer_id: customerId,
      customer_email: customerEmailForOrder,
      customer_name: resolvedName,
      total_cents: totalWithDiscount,
      currency,
      status: "pending",
      shipping_address: shippingAddress,
      shipping_city: shippingCity,
      shipping_postal_code: shippingPostalCode || null,
      shipping_phone: shippingPhone,
      checkout_payment_method: useTransfer ? "transfer" : "wompi",
      transfer_session_token: transferSessionToken,
    })
    .select("id")
    .single();

  if (oErr || !orderRow) {
    redirect("/checkout?error=order");
  }

  const orderId = orderRow.id as string;

  const { error: iErr } = await supabase.from("order_items").insert(
    lines.map((l) => ({
      order_id: orderId,
      product_id: l.product_id,
      quantity: l.quantity,
      unit_price_cents: l.unit_price_cents,
      product_name_snapshot: l.product_name_snapshot,
    })),
  );

  if (iErr) {
    await supabase.from("orders").delete().eq("id", orderId);
    redirect("/checkout?error=items");
  }

  revalidatePath("/admin/ventas");
  revalidatePath("/admin/orders");
  revalidatePath("/cuenta/pedidos");

  if (useTransfer && transferSessionToken) {
    await setCart([]);
    redirect(
      `/checkout/transferencia?order_id=${encodeURIComponent(orderId)}&t=${encodeURIComponent(transferSessionToken)}`,
    );
  }

  const returnUrl = `${getPublicSiteUrl()}/checkout/return?order_id=${orderId}`;

  if (shouldSkipWompiPayment()) {
    await supabase
      .from("orders")
      .update({
        wompi_reference: orderId,
      })
      .eq("id", orderId);

    await setCart([]);

    if (process.env.NODE_ENV === "development") {
      console.info(
        "[checkout] Wompi omitido (sin clave en dev o CHECKOUT_SKIP_WOMPI). Pedido:",
        orderId,
      );
    }

    redirect(`${returnUrl}&test_checkout=1`);
  }

  const link = await createPaymentLink({
    name: `${storeBrand} · Pedido`,
    description: `Pedido ${orderId}`,
    amountInCents: totalWithDiscount,
    currency,
    redirectUrl: returnUrl,
    sku: orderId,
    singleUse: true,
  });

  if (!link.ok) {
    await supabase.from("orders").delete().eq("id", orderId);
    redirect(
      `/checkout?error=wompi&message=${encodeURIComponent(link.error)}`,
    );
  }

  await supabase
    .from("orders")
    .update({
      wompi_payment_link_id: link.id,
      wompi_reference: orderId,
    })
    .eq("id", orderId);

  await setCart([]);

  const env = getWompiEnv();
  if (process.env.NODE_ENV === "development") {
    console.info("[checkout] Wompi env:", env, "order:", orderId);
  }

  redirect(link.url);
}
