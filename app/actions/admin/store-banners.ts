"use server";

import { assertActionPermission } from "@/lib/require-admin-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { StoreBannerPlacement } from "@/lib/store-banners";
import { parseStoragePublicPath } from "@/lib/storage-bucket-path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";

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

async function assertProfile(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
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
  return user;
}

function revalidateStorefront() {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/banners");
}

export async function uploadStoreBanner(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  await assertProfile(supabase);
  await assertActionPermission("marketing_ver");

  const placement = String(formData.get("placement") ?? "").trim() as StoreBannerPlacement;
  if (placement !== "hero" && placement !== "products") {
    redirect("/admin/banners?error=placement");
  }

  const raw = formData.get("image");
  if (raw == null || typeof raw === "string" || !(raw instanceof Blob) || raw.size <= 0) {
    redirect("/admin/banners?error=file");
  }
  if (raw.size > MAX_BYTES) {
    redirect("/admin/banners?error=size");
  }
  const mime = raw.type || "";
  if (mime && !ALLOWED_TYPES.has(mime)) {
    redirect("/admin/banners?error=type");
  }

  const ext =
    typeof File !== "undefined" && raw instanceof File
      ? extFromFilename(raw.name)
      : "jpg";
  const buf = Buffer.from(await raw.arrayBuffer());
  const objectPath = `${placement}/${randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("store-banners")
    .upload(objectPath, buf, {
      contentType: raw.type || `image/${ext === "jpg" ? "jpeg" : ext}`,
      upsert: false,
    });

  if (upErr) {
    redirect("/admin/banners?error=upload");
  }

  const imagePath = `store-banners/${objectPath}`;
  const hrefRaw = String(formData.get("href") ?? "").trim();
  const href = hrefRaw.length > 0 ? hrefRaw : null;

  const { data: maxRows } = await supabase
    .from("store_banners")
    .select("sort_order")
    .eq("placement", placement)
    .order("sort_order", { ascending: false })
    .limit(1);

  const maxSort = maxRows?.[0]?.sort_order;
  const sortOrder =
    typeof maxSort === "number" && Number.isFinite(maxSort) ? maxSort + 1 : 0;

  const { error: insErr } = await supabase.from("store_banners").insert({
    placement,
    image_path: imagePath,
    href,
    alt_text: "",
    sort_order: sortOrder,
    is_published: true,
  });

  if (insErr) {
    await supabase.storage.from("store-banners").remove([objectPath]);
    redirect("/admin/banners?error=db");
  }

  revalidateStorefront();
  redirect("/admin/banners");
}

export async function deleteStoreBanner(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  await assertProfile(supabase);
  await assertActionPermission("marketing_ver");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/banners?error=id");

  const { data: row } = await supabase
    .from("store_banners")
    .select("image_path")
    .eq("id", id)
    .maybeSingle();

  if (!row?.image_path) redirect("/admin/banners?error=missing");

  const parsed = parseStoragePublicPath(row.image_path as string);
  if (parsed?.bucket === "store-banners") {
    await supabase.storage.from("store-banners").remove([parsed.objectPath]);
  }

  const { error } = await supabase.from("store_banners").delete().eq("id", id);
  if (error) redirect("/admin/banners?error=db");

  revalidateStorefront();
  redirect("/admin/banners");
}

export async function updateStoreBanner(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  await assertProfile(supabase);
  await assertActionPermission("marketing_ver");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/banners?error=id");

  const hrefRaw = String(formData.get("href") ?? "").trim();
  const href = hrefRaw.length > 0 ? hrefRaw : null;
  const sortOrder = Math.max(0, Math.floor(Number(formData.get("sort_order") ?? 0)));
  const isPublished = formData.get("is_published") === "on";

  const { error } = await supabase
    .from("store_banners")
    .update({
      href,
      alt_text: "",
      sort_order: sortOrder,
      is_published: isPublished,
    })
    .eq("id", id);

  if (error) redirect("/admin/banners?error=db");

  revalidateStorefront();
  redirect("/admin/banners");
}
