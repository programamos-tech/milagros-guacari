"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifyInsertedRowInDev } from "@/lib/admin-insert-verify";
import { assertActionPermission } from "@/lib/require-admin-permission";
import { normalizeMunicipalityName } from "@/lib/store-shipping";
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

function revalidateShipping() {
  revalidatePath("/admin/envios");
  revalidatePath("/admin/envios/nuevo");
  revalidatePath("/checkout");
}

function parseRateCents(raw: string): number | null {
  const n = Math.floor(Number(String(raw ?? "").replace(/\D/g, "")));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export async function createStoreShippingMunicipality(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  await assertProfile(supabase);
  await assertActionPermission("ajustes_tienda_ver");

  const name = normalizeMunicipalityName(String(formData.get("name") ?? ""));
  const department = String(formData.get("department") ?? "").trim() || null;
  const rateCents = parseRateCents(String(formData.get("rate_cents") ?? ""));
  const isEnabled = formData.get("is_enabled") === "on";
  const sortRaw = String(formData.get("sort_order") ?? "").trim();
  const sortOrder =
    sortRaw.length > 0 ? Math.max(0, Math.floor(Number(sortRaw))) : 0;

  if (!name) redirect("/admin/envios/nuevo?envios_error=name");
  if (rateCents == null) redirect("/admin/envios/nuevo?envios_error=rate");

  const { data: inserted, error } = await supabase
    .from("store_shipping_municipalities")
    .insert({
      name,
      department,
      rate_cents: rateCents,
      is_enabled: isEnabled,
      sort_order: sortOrder,
    })
    .select("id")
    .single();

  if (error || !inserted?.id) {
    if (error?.code === "23505") {
      redirect("/admin/envios/nuevo?envios_error=duplicate");
    }
    redirect("/admin/envios/nuevo?envios_error=db");
  }

  if (
    !(await verifyInsertedRowInDev(
      supabase,
      "store_shipping_municipalities",
      inserted.id as string,
    ))
  ) {
    await supabase
      .from("store_shipping_municipalities")
      .delete()
      .eq("id", inserted.id);
    redirect("/admin/envios/nuevo?envios_error=db");
  }

  revalidateShipping();
  redirect("/admin/envios");
}

export async function updateStoreShippingMunicipality(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  await assertProfile(supabase);
  await assertActionPermission("ajustes_tienda_ver");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/envios?envios_error=not_found");

  const name = normalizeMunicipalityName(String(formData.get("name") ?? ""));
  const department = String(formData.get("department") ?? "").trim() || null;
  const rateCents = parseRateCents(String(formData.get("rate_cents") ?? ""));
  const isEnabled = formData.get("is_enabled") === "on";
  const sortRaw = String(formData.get("sort_order") ?? "").trim();
  const sortOrder =
    sortRaw.length > 0 ? Math.max(0, Math.floor(Number(sortRaw))) : 0;

  if (!name) redirect(`/admin/envios/${id}/edit?envios_error=name`);
  if (rateCents == null) redirect(`/admin/envios/${id}/edit?envios_error=rate`);

  const { error } = await supabase
    .from("store_shipping_municipalities")
    .update({
      name,
      department,
      rate_cents: rateCents,
      is_enabled: isEnabled,
      sort_order: sortOrder,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      redirect(`/admin/envios/${id}/edit?envios_error=duplicate`);
    }
    redirect(`/admin/envios/${id}/edit?envios_error=db`);
  }

  revalidateShipping();
  revalidatePath(`/admin/envios/${id}/edit`);
  redirect("/admin/envios");
}

export async function deleteStoreShippingMunicipality(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  await assertProfile(supabase);
  await assertActionPermission("ajustes_tienda_ver");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/envios?envios_error=not_found");

  const { error } = await supabase
    .from("store_shipping_municipalities")
    .delete()
    .eq("id", id);

  if (error) redirect("/admin/envios?envios_error=db");

  revalidateShipping();
  redirect("/admin/envios");
}
