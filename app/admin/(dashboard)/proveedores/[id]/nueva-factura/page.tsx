import {
  SupplierNewInvoiceForm,
  SupplierNewInvoiceHeader,
} from "@/components/admin/SupplierNewInvoiceForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminProveedorNuevaFacturaPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const supabase = await createSupabaseServerClient();
  const { data: s } = await supabase.from("suppliers").select("id,name").eq("id", id).maybeSingle();
  if (!s) notFound();
  const issueDateDefault = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl">
      <SupplierNewInvoiceHeader fixedSupplierId={id} supplierName={s.name} />

      {error ? (
        <p className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error === "validation"
            ? "Revisá fecha y al menos un producto con cantidad y precio unitario válidos."
            : error === "db"
              ? "No se pudo guardar la factura o sus líneas. Revisá permisos y que exista la migración supplier_invoice_lines."
              : "No se pudo completar la operación."}
        </p>
      ) : null}

      <SupplierNewInvoiceForm
        issueDateDefault={issueDateDefault}
        suppliers={[]}
        fixedSupplierId={id}
        fixedSupplierName={s.name}
      />
    </div>
  );
}
