import { NewExpenseForm, NewExpenseHeader } from "@/components/admin/NewExpenseForm";
import { requireAdminPermission } from "@/lib/require-admin-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminNuevoEgresoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPermission("egresos_crear");
  const sp = await searchParams;
  const expenseErrorCode =
    typeof sp.expense_error === "string" ? sp.expense_error : undefined;

  const supabase = await createSupabaseServerClient();
  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id,display_name,login_username")
    .eq("is_active", true)
    .order("display_name", { ascending: true });

  const turnWorkers = (profileRows ?? []).map((p) => {
    const display = String(p.display_name ?? "").trim();
    const login = String(p.login_username ?? "").trim();
    return {
      id: String(p.id),
      label: display || login || "Colaborador",
    };
  });

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6">
      <NewExpenseHeader />
      <NewExpenseForm initialError={expenseErrorCode} turnWorkers={turnWorkers} />
    </div>
  );
}

