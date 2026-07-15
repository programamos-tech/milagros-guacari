"use server";

import { logAdminActivity } from "@/lib/admin-activity-log";
import {
  verifyInsertedRowInDev,
  verifyRowCountAtLeastInDev,
} from "@/lib/admin-insert-verify";
import { fetchKitWithItems } from "@/lib/load-product-kits";
import {
  kitMarginPreview,
  maxKitsAvailableFromItems,
  type KitPricingMode,
} from "@/lib/product-kits";
import { assertProductImageSize } from "@/lib/product-image-upload";
import { assertActionPermission } from "@/lib/require-admin-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  revalidateStoreKitsTag,
  revalidateStoreProductsTag,
} from "@/lib/revalidate-store-cache";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type KitItemInput = { productId: string; quantity: number };

function parseKitItems(formData: FormData): KitItemInput[] {
  const raw = String(formData.get("kit_items_json") ?? "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: KitItemInput[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const productId = String((row as { productId?: string }).productId ?? "").trim();
      const quantity = Math.floor(Number((row as { quantity?: number }).quantity));
      if (!UUID_RE.test(productId) || quantity < 1) continue;
      out.push({ productId, quantity });
    }
    return out;
  } catch {
    return [];
  }
}

function parsePricingMode(raw: string): KitPricingMode {
  return raw === "fixed" ? "fixed" : "sum_discount";
}

function redirectKitError(path: string, code: string): never {
  redirect(`${path}?error=${encodeURIComponent(code)}`);
}

function parseKitImageFromForm(formData: FormData): File | null {
  const raw = formData.get("image");
  if (raw == null || typeof raw === "string") return null;
  if (!(raw instanceof Blob) || raw.size <= 0) return null;
  return raw as File;
}

/** Misma convención que productos: clave `kits/...` en bucket `product-images`, DB `product-images/kits/...`. */
async function uploadKitImage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  file: File | null,
): Promise<{ imagePath: string | null; error: string | null }> {
  if (!file || file.size < 1) return { imagePath: null, error: null };

  const sizeMsg = assertProductImageSize(file);
  if (sizeMsg) return { imagePath: null, error: sizeMsg };

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const objectPath = `kits/${randomUUID()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from("product-images").upload(objectPath, buf, {
    contentType: file.type || "image/jpeg",
    upsert: true,
  });

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[uploadKitImage]", error.message, error);
    }
    return { imagePath: null, error: error.message };
  }

  return { imagePath: `product-images/${objectPath}`, error: null };
}

function revalidateKits() {
  revalidateStoreProductsTag();
  revalidateStoreKitsTag();
  revalidatePath("/");
  revalidatePath("/admin/kits");
  revalidatePath("/kits");
  revalidatePath("/products");
  revalidatePath("/admin/ventas/nueva");
}

export async function createKitAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  await assertActionPermission("kits_gestionar");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const isPublished = String(formData.get("is_published") ?? "") === "on";
  const pricingMode = parsePricingMode(String(formData.get("pricing_mode") ?? ""));
  const discountPercent = Math.min(
    100,
    Math.max(0, Math.floor(Number(formData.get("discount_percent") ?? 0))),
  );
  const priceCents = Math.max(0, Math.floor(Number(formData.get("price_cents") ?? 0)));
  const sortOrder = Math.floor(Number(formData.get("sort_order") ?? 0)) || 0;
  const items = parseKitItems(formData);

  if (name.length < 2) redirectKitError("/admin/kits/nuevo", "validation");
  if (items.length < 1) redirectKitError("/admin/kits/nuevo", "items");

  const imageFile = parseKitImageFromForm(formData);
  const { imagePath, error: imageErr } = await uploadKitImage(supabase, imageFile);
  if (imageFile && !imagePath) {
    redirectKitError(
      "/admin/kits/nuevo",
      imageErr ? "image_upload" : "image",
    );
  }

  const { data: kitRow, error: kErr } = await supabase
    .from("product_kits")
    .insert({
      name,
      description,
      is_published: isPublished,
      pricing_mode: pricingMode,
      discount_percent: discountPercent,
      price_cents: priceCents,
      sort_order: sortOrder,
      image_path: imagePath,
    })
    .select("id")
    .single();

  if (kErr || !kitRow?.id) {
    if (process.env.NODE_ENV === "development") {
      console.error("[createKitAction] product_kits insert:", kErr?.message, kErr?.code);
    }
    const code =
      kErr?.code === "42P01" || (kErr?.message ?? "").includes("product_kits")
        ? "migration"
        : "db";
    redirectKitError("/admin/kits/nuevo", code);
  }

  const kitId = String(kitRow.id);
  const itemRows = items.map((it, i) => ({
    kit_id: kitId,
    product_id: it.productId,
    quantity: it.quantity,
    sort_order: i,
  }));

  const { error: iErr } = await supabase.from("product_kit_items").insert(itemRows);
  if (iErr) {
    if (process.env.NODE_ENV === "development") {
      console.error("[createKitAction] product_kit_items insert:", iErr.message, iErr.code);
    }
    await supabase.from("product_kits").delete().eq("id", kitId);
    const code =
      iErr.code === "42P01" || (iErr.message ?? "").includes("product_kit_items")
        ? "migration"
        : "db";
    redirectKitError("/admin/kits/nuevo", code);
  }

  if (!(await verifyInsertedRowInDev(supabase, "product_kits", kitId))) {
    await supabase.from("product_kits").delete().eq("id", kitId);
    redirectKitError("/admin/kits/nuevo", "db");
  }
  if (
    !(await verifyRowCountAtLeastInDev(
      supabase,
      "product_kit_items",
      { column: "kit_id", value: kitId },
      itemRows.length,
    ))
  ) {
    await supabase.from("product_kit_items").delete().eq("kit_id", kitId);
    await supabase.from("product_kits").delete().eq("id", kitId);
    redirectKitError("/admin/kits/nuevo", "db");
  }

  await logAdminActivity(supabase, {
    actorId: user.id,
    actionType: "product_created",
    entityType: "product",
    entityId: kitId,
    summary: `Kit creado: ${name}`,
    metadata: { kind: "kit", item_count: items.length },
  });

  revalidateKits();
  redirect("/admin/kits?created=1");
}

export async function updateKitAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  await assertActionPermission("kits_gestionar");

  const kitId = String(formData.get("kit_id") ?? "").trim();
  if (!UUID_RE.test(kitId)) redirectKitError("/admin/kits", "validation");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const isPublished = String(formData.get("is_published") ?? "") === "on";
  const pricingMode = parsePricingMode(String(formData.get("pricing_mode") ?? ""));
  const discountPercent = Math.min(
    100,
    Math.max(0, Math.floor(Number(formData.get("discount_percent") ?? 0))),
  );
  const priceCents = Math.max(0, Math.floor(Number(formData.get("price_cents") ?? 0)));
  const sortOrder = Math.floor(Number(formData.get("sort_order") ?? 0)) || 0;
  const items = parseKitItems(formData);
  const removeImage = String(formData.get("remove_image") ?? "") === "on";

  if (name.length < 2) redirectKitError(`/admin/kits/${kitId}/edit`, "validation");
  if (items.length < 1) redirectKitError(`/admin/kits/${kitId}/edit`, "items");

  const existing = await fetchKitWithItems(supabase, kitId);
  if (!existing) redirectKitError("/admin/kits", "not_found");

  let imagePath = existing.image_path;
  const imageFile = parseKitImageFromForm(formData);
  const { imagePath: uploaded, error: imageErr } = await uploadKitImage(
    supabase,
    imageFile,
  );
  if (imageFile && !uploaded) {
    redirectKitError(
      `/admin/kits/${kitId}/edit`,
      imageErr ? "image_upload" : "image",
    );
  }
  if (uploaded) imagePath = uploaded;
  else if (removeImage) imagePath = null;

  const { error: uErr } = await supabase
    .from("product_kits")
    .update({
      name,
      description,
      is_published: isPublished,
      pricing_mode: pricingMode,
      discount_percent: discountPercent,
      price_cents: priceCents,
      sort_order: sortOrder,
      image_path: imagePath,
    })
    .eq("id", kitId);

  if (uErr) redirectKitError(`/admin/kits/${kitId}/edit`, "db");

  await supabase.from("product_kit_items").delete().eq("kit_id", kitId);
  const itemRows = items.map((it, i) => ({
    kit_id: kitId,
    product_id: it.productId,
    quantity: it.quantity,
    sort_order: i,
  }));
  const { error: iErr } = await supabase.from("product_kit_items").insert(itemRows);
  if (iErr) redirectKitError(`/admin/kits/${kitId}/edit`, "db");

  await logAdminActivity(supabase, {
    actorId: user.id,
    actionType: "product_updated",
    entityType: "product",
    entityId: kitId,
    summary: `Kit actualizado: ${name}`,
    metadata: { kind: "kit", item_count: items.length },
  });

  revalidateKits();
  redirect(`/admin/kits/${kitId}/edit?saved=1`);
}

export async function deleteKitAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  await assertActionPermission("kits_gestionar");

  const kitId = String(formData.get("kit_id") ?? "").trim();
  if (!UUID_RE.test(kitId)) redirect("/admin/kits");

  const { error } = await supabase.from("product_kits").delete().eq("id", kitId);
  if (error) redirect(`/admin/kits/${kitId}/edit?error=delete`);

  revalidateKits();
  redirect("/admin/kits?deleted=1");
}

/** Vista previa de margen (server action para el formulario). */
export async function previewKitMarginAction(payload: {
  pricingMode: KitPricingMode;
  discountPercent: number;
  priceCents: number;
  items: KitItemInput[];
}): Promise<{
  sumGrossCents: number;
  costCents: number;
  saleCents: number;
  marginCents: number;
  marginPercent: number | null;
  maxPosKits: number;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      sumGrossCents: 0,
      costCents: 0,
      saleCents: 0,
      marginCents: 0,
      marginPercent: null,
      maxPosKits: 0,
    };
  }

  const ids = [...new Set(payload.items.map((i) => i.productId))];
  if (ids.length === 0) {
    return {
      sumGrossCents: 0,
      costCents: 0,
      saleCents: 0,
      marginCents: 0,
      marginPercent: null,
      maxPosKits: 0,
    };
  }

  const { data: products } = await supabase
    .from("products")
    .select(
      "id,name,price_cents,cost_cents,stock_quantity,stock_local,stock_warehouse,is_published,has_vat,vat_percent,reference",
    )
    .in("id", ids);

  const byId = new Map((products ?? []).map((p) => [p.id as string, p]));

  const kitItems = payload.items.map((it) => ({
    product_id: it.productId,
    quantity: it.quantity,
    products: byId.get(it.productId) ?? null,
  }));

  const margin = kitMarginPreview(
    {
      pricing_mode: payload.pricingMode,
      discount_percent: payload.discountPercent,
      price_cents: payload.priceCents,
    },
    kitItems,
    "pos",
  );

  return {
    ...margin,
    maxPosKits: maxKitsAvailableFromItems(kitItems, "pos"),
  };
}
