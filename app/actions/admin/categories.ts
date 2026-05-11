"use server";

import { isCategoryIconKey, resolveCategoryIconKey } from "@/lib/category-icons";
import { assertActionPermission } from "@/lib/require-admin-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createCategory(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  await assertActionPermission("categorias_gestionar");

  const fromModal = String(formData.get("from") ?? "") === "modal";
  const name = String(formData.get("name") ?? "").trim();
  const iconRaw = String(formData.get("icon_key") ?? "").trim();
  const iconKey = resolveCategoryIconKey(iconRaw);

  const redirectErr = (kind: "name" | "db") => {
    if (fromModal) {
      redirect(`/admin/products?categories=1&category_error=${kind}`);
    }
    redirect(`/admin/categories/new?error=${kind}`);
  };

  if (!name) redirectErr("name");

  if (iconRaw && !isCategoryIconKey(iconRaw)) redirectErr("db");

  const { error } = await supabase
    .from("categories")
    .insert({ name, icon_key: iconKey });
  if (error) redirectErr("db");

  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  redirect("/admin/products?categories=1");
}

export async function deleteCategory(categoryId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  await assertActionPermission("categorias_gestionar");

  await supabase.from("categories").delete().eq("id", categoryId);
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  redirect("/admin/products?categories=1");
}

export async function updateCategoryListingHero(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  await assertActionPermission("categorias_gestionar");

  const categoryId = String(formData.get("category_id") ?? "").trim();
  if (!categoryId) redirect("/admin/products?categories=1");

  const pathRaw = String(formData.get("listing_hero_image_path") ?? "").trim();
  const altRaw = String(formData.get("listing_hero_alt_text") ?? "").trim();

  const { error } = await supabase
    .from("categories")
    .update({
      listing_hero_image_path: pathRaw || null,
      listing_hero_alt_text: altRaw || null,
    })
    .eq("id", categoryId);

  if (error) {
    redirect("/admin/products?categories=1&category_error=db");
  }

  revalidatePath("/products");
  revalidatePath("/admin/products");
  redirect("/admin/products?categories=1");
}
