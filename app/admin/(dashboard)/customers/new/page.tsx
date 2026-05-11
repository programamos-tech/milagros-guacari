import {
  NewCustomerForm,
  NewCustomerHeader,
} from "@/components/admin/NewCustomerForm";
import { requireAdminPermission } from "@/lib/require-admin-permission";

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdminPermission("clientes_crear");
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;

  return (
    <div className="mx-auto max-w-7xl">
      <NewCustomerHeader />

      {error ? (
        <p className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100">
          {error === "name"
            ? "El nombre es obligatorio."
            : error === "duplicate_email"
              ? "Ya existe un cliente con ese correo electrónico."
              : error === "addresses_invalid"
                ? "Los datos de dirección no son válidos. Recarga la página e intenta de nuevo."
                : "No se pudo guardar en la base de datos. Ejecuta en Supabase la migración de direcciones (20260513120000_customer_addresses.sql) si falta la tabla."}
        </p>
      ) : null}

      <NewCustomerForm />
    </div>
  );
}
