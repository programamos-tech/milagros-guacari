"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  cartLinesMatchFragrance,
  cartLinesMatchKit,
  getCart,
  isCartKitLine,
  isCartProductLine,
  setCart,
  type CartLine,
} from "@/lib/cart";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { expandFragranceLabels } from "@/lib/fragrance-options";
import { fetchKitWithItems } from "@/lib/load-product-kits";
import {
  kitIsAvailable,
  maxKitsAvailableFromItems,
} from "@/lib/product-kits";
import { normalizeStorefrontCartLines } from "@/lib/storefront-cart";
import { productHasStorefrontImage } from "@/lib/storefront-product-image";

function revalidateStoreCart() {
  revalidatePath("/products");
  revalidatePath("/kits");
  revalidatePath("/checkout");
  revalidatePath("/", "layout");
}

/** Quita de la cookie líneas con productos no publicados, sin stock o inexistentes. */
async function syncCartCookieIfStale() {
  const raw = await getCart();
  const normalized = await normalizeStorefrontCartLines(raw);
  if (JSON.stringify(raw) !== JSON.stringify(normalized)) {
    await setCart(normalized);
    revalidateStoreCart();
  }
}

export async function addToCart(
  productId: string,
  quantity: number,
  fragrance?: string,
) {
  await syncCartCookieIfStale();
  const q = Math.max(1, Math.floor(quantity || 1));
  const frag =
    typeof fragrance === "string" && fragrance.trim()
      ? fragrance.trim()
      : undefined;
  const supabase = await createSupabaseServerClient();
  const { data: row } = await supabase
    .from("products")
    .select("stock_quantity, fragrance_options, image_path")
    .eq("id", productId)
    .eq("is_published", true)
    .maybeSingle();

  if (!row || !productHasStorefrontImage(row.image_path)) return;

  const fragOptsRaw = Array.isArray(row.fragrance_options)
    ? row.fragrance_options.filter(
        (x): x is string => typeof x === "string" && x.trim().length > 0,
      )
    : [];
  const fragOpts = expandFragranceLabels(fragOptsRaw);
  if (fragOpts.length > 1 && !frag) return;

  const stock = Math.max(0, Math.floor(Number(row.stock_quantity ?? 0)));
  if (stock <= 0) return;

  const cart = await getCart();
  const next: CartLine[] = [...cart];
  const i = next.findIndex(
    (l) =>
      isCartProductLine(l) &&
      cartLinesMatchFragrance(l, { productId, fragrance: frag }),
  );
  const current = i >= 0 ? next[i]!.quantity : 0;
  const newQty = Math.min(current + q, stock);
  if (newQty <= 0) return;

  const line: CartLine = { productId, quantity: newQty, fragrance: frag };
  if (i >= 0) next[i] = line;
  else next.push(line);

  await setCart(next);
  revalidateStoreCart();
}

export async function setLineQuantity(
  productId: string,
  quantity: number,
  fragrance?: string,
) {
  await syncCartCookieIfStale();
  const raw = Math.floor(quantity);
  const frag =
    typeof fragrance === "string" && fragrance.trim()
      ? fragrance.trim()
      : undefined;
  const supabase = await createSupabaseServerClient();
  const { data: row } = await supabase
    .from("products")
    .select("stock_quantity")
    .eq("id", productId)
    .eq("is_published", true)
    .maybeSingle();
  const stock = Math.max(0, Math.floor(Number(row?.stock_quantity ?? 0)));

  const cart = await getCart();
  let next: CartLine[];

  if (raw <= 0 || stock <= 0) {
    next = cart.filter(
      (l) =>
        !isCartProductLine(l) ||
        !cartLinesMatchFragrance(l, { productId, fragrance: frag }),
    );
  } else {
    const q = Math.min(raw, stock);
    const idx = cart.findIndex(
      (l) =>
        isCartProductLine(l) &&
        cartLinesMatchFragrance(l, { productId, fragrance: frag }),
    );
    if (idx >= 0) {
      next = cart.map((l, i) =>
        i === idx && isCartProductLine(l)
          ? { ...l, quantity: q, fragrance: frag ?? l.fragrance }
          : l,
      );
    } else {
      next = [...cart, { productId, quantity: q, fragrance: frag }];
    }
  }
  await setCart(next);
  revalidateStoreCart();
}

export async function addToCartFromForm(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  const qty = Number(formData.get("quantity") ?? 1);
  const fragranceRaw = String(formData.get("fragrance") ?? "").trim();
  if (!productId) return;
  await addToCart(
    productId,
    Number.isFinite(qty) ? qty : 1,
    fragranceRaw || undefined,
  );
}

/** Deja solo este ítem en la bolsa y va al checkout (flujo “Comprar ahora”). */
export async function buyNowFromDetail(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  if (!productId) redirect("/products");

  const requested = Math.max(
    1,
    Math.floor(Number(formData.get("quantity") ?? 1)),
  );

  const supabase = await createSupabaseServerClient();
  const { data: row } = await supabase
    .from("products")
    .select("stock_quantity, fragrance_options")
    .eq("id", productId)
    .eq("is_published", true)
    .maybeSingle();

  if (!row) redirect("/products");

  const stock = Math.max(0, Math.floor(Number(row.stock_quantity ?? 0)));
  if (stock <= 0) redirect("/products");

  const fragOptsRaw = Array.isArray(row.fragrance_options)
    ? row.fragrance_options.filter(
        (x): x is string => typeof x === "string" && x.trim().length > 0,
      )
    : [];
  const fragOpts = expandFragranceLabels(fragOptsRaw);
  const fragranceRaw = String(formData.get("fragrance") ?? "").trim();
  if (fragOpts.length > 1 && !fragranceRaw) {
    redirect(`/products/${productId}`);
  }

  const qty = Math.min(requested, stock);
  await setCart([
    {
      productId,
      quantity: qty,
      fragrance: fragranceRaw || undefined,
    },
  ]);
  revalidateStoreCart();
  redirect("/checkout");
}

export async function updateLineFromForm(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  const q = Number(formData.get("quantity") ?? 0);
  const fragranceRaw = String(formData.get("fragrance") ?? "").trim();
  if (!productId) return;
  await setLineQuantity(productId, q, fragranceRaw || undefined);
}

export async function addKitToCart(kitId: string, quantity: number) {
  await syncCartCookieIfStale();
  const id = kitId.trim();
  if (!id) return;
  const q = Math.max(1, Math.floor(quantity || 1));

  const supabase = await createSupabaseServerClient();
  const kit = await fetchKitWithItems(supabase, id);
  if (!kit || !kitIsAvailable(kit, "storefront")) return;

  const maxK = maxKitsAvailableFromItems(kit.items ?? [], "storefront");
  if (maxK < 1) return;

  const cart = await getCart();
  const next: CartLine[] = [...cart];
  const i = next.findIndex(
    (l) => isCartKitLine(l) && cartLinesMatchKit(l, { kitId: id }),
  );
  const current = i >= 0 ? next[i]!.quantity : 0;
  const newQty = Math.min(current + q, maxK);
  if (newQty <= 0) return;

  const line: CartLine = { kitId: id, quantity: newQty };
  if (i >= 0) next[i] = line;
  else next.push(line);

  await setCart(next);
  revalidateStoreCart();
}

export async function setKitLineQuantity(kitId: string, quantity: number) {
  await syncCartCookieIfStale();
  const id = kitId.trim();
  if (!id) return;
  const raw = Math.floor(quantity);

  const supabase = await createSupabaseServerClient();
  const kit = await fetchKitWithItems(supabase, id);
  const maxK = kit
    ? maxKitsAvailableFromItems(kit.items ?? [], "storefront")
    : 0;

  const cart = await getCart();
  let next: CartLine[];

  if (raw <= 0 || maxK <= 0) {
    next = cart.filter(
      (l) => !isCartKitLine(l) || !cartLinesMatchKit(l, { kitId: id }),
    );
  } else {
    const q = Math.min(raw, maxK);
    const idx = cart.findIndex(
      (l) => isCartKitLine(l) && cartLinesMatchKit(l, { kitId: id }),
    );
    if (idx >= 0) {
      next = cart.map((l, i) => (i === idx ? { kitId: id, quantity: q } : l));
    } else {
      next = [...cart, { kitId: id, quantity: q }];
    }
  }
  await setCart(next);
  revalidateStoreCart();
}

export async function addKitToCartFromForm(formData: FormData) {
  const kitId = String(formData.get("kitId") ?? "");
  const qty = Number(formData.get("quantity") ?? 1);
  if (!kitId) return;
  await addKitToCart(kitId, Number.isFinite(qty) ? qty : 1);
}

export async function updateKitLineFromForm(formData: FormData) {
  const kitId = String(formData.get("kitId") ?? "");
  const q = Number(formData.get("quantity") ?? 0);
  if (!kitId) return;
  await setKitLineQuantity(kitId, q);
}

export async function clearCart() {
  await setCart([]);
  revalidateStoreCart();
}
