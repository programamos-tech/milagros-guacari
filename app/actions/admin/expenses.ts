"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { todayYmdInReportStore } from "@/lib/admin-report-range";
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

export async function createStoreExpense(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  await assertProfile(supabase);
  await assertActionPermission("egresos_crear");

  const concept = String(formData.get("concept") ?? "").trim();
  if (!concept) redirect("/admin/egresos/nuevo?expense_error=concept");

  const amountRaw = Math.floor(Number(formData.get("amount_cents") ?? 0));
  if (!Number.isFinite(amountRaw) || amountRaw < 0) {
    redirect("/admin/egresos/nuevo?expense_error=amount");
  }

  const categoryRaw = String(formData.get("category") ?? "").trim();
  const category = categoryRaw || "operativo";
  const paymentMethodRaw = String(formData.get("payment_method") ?? "").trim();
  const paymentMethod = paymentMethodRaw || "transferencia";
  const notesRaw = String(formData.get("notes") ?? "").trim();
  const notes = notesRaw.length > 0 ? notesRaw : null;
  const expenseDateRaw = String(formData.get("expense_date") ?? "").trim();
  const expenseDate =
    expenseDateRaw.length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(expenseDateRaw)
      ? expenseDateRaw
      : todayYmdInReportStore();

  const { error } = await supabase.from("store_expenses").insert({
    concept,
    amount_cents: amountRaw,
    category,
    payment_method: paymentMethod,
    notes,
    expense_date: expenseDate,
  });

  if (error) redirect("/admin/egresos/nuevo?expense_error=db");

  revalidatePath("/admin/egresos/nuevo");
  revalidatePath("/admin/egresos");
  revalidatePath("/admin");
  redirect("/admin/egresos");
}

