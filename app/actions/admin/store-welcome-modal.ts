"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { assertActionPermission } from "@/lib/require-admin-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseStoragePublicPath } from "@/lib/storage-bucket-path";

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

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/settings");
}

function extFromFilename(name: string) {
  const i = name.lastIndexOf(".");
  if (i < 0) return "jpg";
  return name.slice(i + 1).toLowerCase().slice(0, 8) || "jpg";
}

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_BYTES = 5 * 1024 * 1024;

async function uploadModalImage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  raw: Blob,
) {
  if (raw.size > MAX_BYTES) redirect("/admin/settings?welcome_error=size");
  const mime = raw.type || "";
  if (mime && !ALLOWED_TYPES.has(mime)) {
    redirect("/admin/settings?welcome_error=type");
  }
  const ext =
    typeof File !== "undefined" && raw instanceof File
      ? extFromFilename(raw.name)
      : "jpg";
  const objectPath = `welcome-modal/${randomUUID()}.${ext}`;
  const buf = Buffer.from(await raw.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from("store-banners")
    .upload(objectPath, buf, {
      contentType: raw.type || `image/${ext === "jpg" ? "jpeg" : ext}`,
      upsert: false,
    });
  if (upErr) redirect("/admin/settings?welcome_error=upload");
  return `store-banners/${objectPath}`;
}

export async function createStoreWelcomeModal(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  await assertProfile(supabase);
  await assertActionPermission("ajustes_tienda_ver");

  const title = String(formData.get("title") ?? "").trim();
  if (!title) redirect("/admin/settings?welcome_error=title");

  const description = String(formData.get("description") ?? "").trim();
  const discountCodeRaw = String(formData.get("discount_code") ?? "").trim();
  const discountCode = discountCodeRaw.length > 0 ? discountCodeRaw : null;
  const ctaLabel = String(formData.get("cta_label") ?? "").trim() || "Escribir por WhatsApp";
  const ctaHrefRaw = String(formData.get("cta_href") ?? "").trim();
  const ctaHref = ctaHrefRaw.length > 0 ? ctaHrefRaw : null;
  const isEnabled = formData.get("is_enabled") === "on";
  const sortRaw = String(formData.get("sort_order") ?? "").trim();
  const sortOrder =
    sortRaw.length > 0 ? Math.max(0, Math.floor(Number(sortRaw))) : 0;
  const imageRaw = formData.get("image");
  let imagePath: string | null = null;
  if (
    imageRaw &&
    typeof imageRaw !== "string" &&
    imageRaw instanceof Blob &&
    imageRaw.size > 0
  ) {
    imagePath = await uploadModalImage(supabase, imageRaw);
  }

  const { error } = await supabase.from("store_welcome_modals").insert({
    title,
    description,
    image_path: imagePath,
    discount_code: discountCode,
    cta_label: ctaLabel,
    cta_href: ctaHref,
    is_enabled: isEnabled,
    sort_order: sortOrder,
  });
  if (error) redirect("/admin/settings?welcome_error=db");

  revalidateAll();
  redirect("/admin/settings");
}

export async function updateStoreWelcomeModal(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  await assertProfile(supabase);
  await assertActionPermission("ajustes_tienda_ver");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/settings?welcome_error=id");

  const title = String(formData.get("title") ?? "").trim();
  if (!title) redirect("/admin/settings?welcome_error=title");

  const description = String(formData.get("description") ?? "").trim();
  const discountCodeRaw = String(formData.get("discount_code") ?? "").trim();
  const discountCode = discountCodeRaw.length > 0 ? discountCodeRaw : null;
  const ctaLabel = String(formData.get("cta_label") ?? "").trim() || "Escribir por WhatsApp";
  const ctaHrefRaw = String(formData.get("cta_href") ?? "").trim();
  const ctaHref = ctaHrefRaw.length > 0 ? ctaHrefRaw : null;
  const isEnabled = formData.get("is_enabled") === "on";
  const sortRaw = String(formData.get("sort_order") ?? "").trim();
  const imageRaw = formData.get("image");
  const removeImage = formData.get("remove_image") === "on";

  const { data: prev } = await supabase
    .from("store_welcome_modals")
    .select("image_path,sort_order")
    .eq("id", id)
    .maybeSingle();
  const prevImage = (prev?.image_path as string | null | undefined) ?? null;
  const prevSort = Number(prev?.sort_order ?? 0);
  const sortOrder =
    sortRaw.length > 0
      ? Math.max(0, Math.floor(Number(sortRaw)))
      : (Number.isFinite(prevSort) ? prevSort : 0);

  let nextImage = prevImage;
  if (removeImage) {
    nextImage = null;
  } else if (
    imageRaw &&
    typeof imageRaw !== "string" &&
    imageRaw instanceof Blob &&
    imageRaw.size > 0
  ) {
    nextImage = await uploadModalImage(supabase, imageRaw);
  }

  const { error } = await supabase
    .from("store_welcome_modals")
    .update({
      title,
      description,
      image_path: nextImage,
      discount_code: discountCode,
      cta_label: ctaLabel,
      cta_href: ctaHref,
      is_enabled: isEnabled,
      sort_order: sortOrder,
    })
    .eq("id", id);
  if (error) redirect("/admin/settings?welcome_error=db");

  if (prevImage && prevImage !== nextImage) {
    const parsed = parseStoragePublicPath(prevImage);
    if (parsed?.bucket === "store-banners") {
      await supabase.storage.from("store-banners").remove([parsed.objectPath]);
    }
  }

  revalidateAll();
  redirect("/admin/settings");
}

export async function deleteStoreWelcomeModal(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  await assertProfile(supabase);
  await assertActionPermission("ajustes_tienda_ver");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/settings?welcome_error=id");

  const { data: row } = await supabase
    .from("store_welcome_modals")
    .select("image_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("store_welcome_modals").delete().eq("id", id);
  if (error) redirect("/admin/settings?welcome_error=db");

  const imagePath = (row?.image_path as string | null | undefined) ?? null;
  if (imagePath) {
    const parsed = parseStoragePublicPath(imagePath);
    if (parsed?.bucket === "store-banners") {
      await supabase.storage.from("store-banners").remove([parsed.objectPath]);
    }
  }

  revalidateAll();
  redirect("/admin/settings");
}

