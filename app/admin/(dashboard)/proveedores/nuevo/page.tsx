import { NewSupplierForm, NewSupplierHeader } from "@/components/admin/NewSupplierForm";
import { AdminNewPageShell } from "@/components/admin/AdminNewPageShell";
import { adminCreateFailedMessage } from "@/lib/admin-create-failed-messages";

export const dynamic = "force-dynamic";

export default async function AdminNuevoProveedorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;

  return (
    <AdminNewPageShell>
      <NewSupplierHeader />

      {error ? (
        <p className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100">
          {error === "name"
            ? "Indicá el nombre del proveedor."
            : adminCreateFailedMessage("supplier")}
        </p>
      ) : null}

      <NewSupplierForm />
    </AdminNewPageShell>
  );
}
