import {
  SupplierNewInvoiceForm,
  SupplierNewInvoiceHeader,
} from "@/components/admin/SupplierNewInvoiceForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminNuevaFacturaProveedorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const supabase = await createSupabaseServerClient();
  const { data: suppliers } = await supabase.from("suppliers").select("id,name").order("name");
  const list = suppliers ?? [];
  const issueDateDefault = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl">
      <SupplierNewInvoiceHeader />

      {error ? (
        <p className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error === "validation"
            ? "Revisá proveedor, fecha y al menos un producto con cantidad y precio unitario válidos."
            : error === "db"
              ? "No se pudo guardar la factura o sus líneas. Revisá permisos y que exista la migración supplier_invoice_lines."
              : "No se pudo completar la operación."}
        </p>
      ) : null}

      {list.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-600">
          Primero creá un proveedor desde{" "}
          <Link href="/admin/proveedores/nuevo" className="font-semibold text-zinc-900 underline">
            Nuevo proveedor
          </Link>
          .
        </div>
      ) : (
        <SupplierNewInvoiceForm issueDateDefault={issueDateDefault} suppliers={list} />
      )}
    </div>
  );
}
