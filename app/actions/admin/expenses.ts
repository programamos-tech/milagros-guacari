"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { todayYmdInReportStore } from "@/lib/admin-report-range";
import { EXPENSE_CANCELLATION_REASON_MIN_LENGTH } from "@/lib/expenses-constants";
import { loadAdminPermissions } from "@/lib/load-admin-permissions";
import { requireAdminPermission } from "@/lib/require-admin-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

function revalidateEgresosList() {
  revalidatePath("/admin/egresos");
}

export async function createStoreExpense(formData: FormData) {
  await requireAdminPermission("egresos_crear");
  const supabase = await createSupabaseServerClient();

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

  const { data: row, error } = await supabase
    .from("store_expenses")
    .insert({
      concept,
      amount_cents: amountRaw,
      category,
      payment_method: paymentMethod,
      notes,
      expense_date: expenseDate,
    })
    .select("id")
    .single();

  if (error || !row?.id) redirect("/admin/egresos/nuevo?expense_error=db");

  revalidateEgresosList();
  redirect("/admin/egresos");
}

export async function cancelStoreExpense(
  expenseId: string,
  cancellationReason: string,
): Promise<
  | { ok: true }
  | {
      ok: false;
      error:
        | "invalid"
        | "auth"
        | "forbidden"
        | "reason_required"
        | "not_found"
        | "already_cancelled"
        | "db";
    }
> {
  const id = String(expenseId ?? "").trim();
  if (!UUID_RE.test(id)) return { ok: false, error: "invalid" };

  const reason = String(cancellationReason ?? "").trim();
  if (reason.length < EXPENSE_CANCELLATION_REASON_MIN_LENGTH) {
    return { ok: false, error: "reason_required" };
  }

  const perm = await loadAdminPermissions();
  if (!perm) return { ok: false, error: "auth" };
  if (!perm.permissions.egresos_crear) {
    return { ok: false, error: "forbidden" };
  }

  const supabase = await createSupabaseServerClient();

  const { data: row } = await supabase
    .from("store_expenses")
    .select("id,is_cancelled")
    .eq("id", id)
    .maybeSingle();

  if (!row) return { ok: false, error: "not_found" };
  if (row.is_cancelled === true) {
    return { ok: false, error: "already_cancelled" };
  }

  const { error } = await supabase
    .from("store_expenses")
    .update({
      is_cancelled: true,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
    })
    .eq("id", id);

  if (error) return { ok: false, error: "db" };

  revalidateEgresosList();
  revalidatePath(`/admin/egresos/${id}`);
  return { ok: true };
}

export async function updateStoreExpenseDate(
  expenseId: string,
  expenseDate: string,
): Promise<
  | { ok: true }
  | {
      ok: false;
      error:
        | "invalid"
        | "auth"
        | "forbidden"
        | "not_found"
        | "cancelled"
        | "date_invalid"
        | "db";
    }
> {
  const id = String(expenseId ?? "").trim();
  const dateRaw = String(expenseDate ?? "").trim();
  if (!UUID_RE.test(id) || !YMD_RE.test(dateRaw)) {
    return { ok: false, error: "invalid" };
  }

  const perm = await loadAdminPermissions();
  if (!perm) return { ok: false, error: "auth" };
  if (!perm.permissions.egresos_crear) {
    return { ok: false, error: "forbidden" };
  }

  const supabase = await createSupabaseServerClient();

  const { data: row } = await supabase
    .from("store_expenses")
    .select("id,is_cancelled")
    .eq("id", id)
    .maybeSingle();

  if (!row) return { ok: false, error: "not_found" };
  if (row.is_cancelled === true) return { ok: false, error: "cancelled" };

  const { error } = await supabase
    .from("store_expenses")
    .update({ expense_date: dateRaw })
    .eq("id", id);

  if (error) return { ok: false, error: "db" };

  revalidateEgresosList();
  revalidatePath(`/admin/egresos/${id}`);
  return { ok: true };
}
