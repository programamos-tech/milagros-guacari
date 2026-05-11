import { NewSupplierForm, NewSupplierHeader } from "@/components/admin/NewSupplierForm";

export const dynamic = "force-dynamic";

export default async function AdminNuevoProveedorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl">
      <NewSupplierHeader />

      {error ? (
        <p className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100">
          {error === "name"
            ? "Indicá el nombre del proveedor."
            : "No se pudo guardar en la base de datos. Revisa la migración de proveedores y los permisos del staff."}
        </p>
      ) : null}

      <NewSupplierForm />
    </div>
  );
}
