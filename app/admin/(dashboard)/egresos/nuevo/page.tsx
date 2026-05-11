import { NewExpenseForm, NewExpenseHeader } from "@/components/admin/NewExpenseForm";
import { requireAdminPermission } from "@/lib/require-admin-permission";

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

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6">
      <NewExpenseHeader />
      <NewExpenseForm initialError={expenseErrorCode} />
    </div>
  );
}

