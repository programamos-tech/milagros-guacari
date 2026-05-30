import {
  NewCustomerForm,
  NewCustomerHeader,
} from "@/components/admin/NewCustomerForm";
import { AdminNewPageShell } from "@/components/admin/AdminNewPageShell";
import { adminCreateFailedMessage } from "@/lib/admin-create-failed-messages";
import { requireAdminPermission } from "@/lib/require-admin-permission";

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; return?: string }>;
}) {
  await requireAdminPermission("clientes_crear");
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const returnTo =
    typeof sp.return === "string" && sp.return.startsWith("/admin/")
      ? sp.return
      : undefined;

  return (
    <AdminNewPageShell>
      <NewCustomerHeader />

      {error ? (
        <p className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100">
          {error === "name"
            ? "El nombre es obligatorio."
            : error === "duplicate_email"
              ? "Ya existe un cliente con ese correo electrónico."
              : error === "duplicate_document"
                ? "Ya existe un cliente con esa cédula o documento."
                : error === "addresses_invalid"
                ? "Los datos de dirección no son válidos. Recarga la página e intenta de nuevo."
                : error === "wholesale_required"
                  ? "Cliente mayorista: completá NIT, correo electrónico válido y teléfono (todos obligatorios)."
                  : adminCreateFailedMessage("customer")}
        </p>
      ) : null}

      <NewCustomerForm returnTo={returnTo} />
    </AdminNewPageShell>
  );
}
