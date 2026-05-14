import { notFound } from "next/navigation";
import {
  EditCustomerForm,
  EditCustomerHeader,
} from "@/components/admin/EditCustomerForm";
import { customerAvatarSeed } from "@/lib/customer-avatar-seed";
import { requireAdminPermission } from "@/lib/require-admin-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminCustomerEditPage({ params, searchParams }: Props) {
  await requireAdminPermission("clientes_editar");
  const { id } = await params;
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;

  const supabase = await createSupabaseServerClient();
  const { data: customer } = await supabase
    .from("customers")
    .select(
      "id,name,email,phone,document_id,shipping_address,customer_kind,wholesale_discount_percent",
    )
    .eq("id", id)
    .maybeSingle();

  if (!customer) notFound();

  const avatarSeed = customerAvatarSeed(id, customer.email);

  const { data: addressRows } = await supabase
    .from("customer_addresses")
    .select("label,address_line,reference,sort_order")
    .eq("customer_id", id)
    .order("sort_order", { ascending: true });

  return (
    <div className="mx-auto max-w-7xl">
      <EditCustomerHeader
        customerId={id}
        customerName={String(customer.name)}
        avatarSeed={avatarSeed}
      />

      {error ? (
        <p className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100">
          {error === "name" ? (
            "El nombre es obligatorio."
          ) : error === "duplicate_email" ? (
            "Ya existe otro cliente con ese correo electrónico."
          ) : error === "addresses_invalid" ? (
            "Los datos de dirección no son válidos. Recarga la página e intenta de nuevo."
          ) : error === "wholesale_required" ? (
            "Cliente mayorista: completá NIT, correo electrónico válido y teléfono (todos obligatorios)."
          ) : (
            <>
              No se pudo guardar en la base de datos. Si falta la tabla de direcciones,
              ejecuta la migración{" "}
              <code className="rounded bg-red-100/80 px-1 py-0.5 text-xs dark:bg-red-950/60">
                20260513120000_customer_addresses.sql
              </code>{" "}
              en Supabase.
            </>
          )}
        </p>
      ) : null}

      <EditCustomerForm
        key={id}
        customerId={id}
        initialName={String(customer.name ?? "")}
        initialEmail={customer.email != null ? String(customer.email) : ""}
        initialPhone={customer.phone != null ? String(customer.phone) : ""}
        initialDocumentId={
          customer.document_id != null ? String(customer.document_id) : ""
        }
        initialCustomerKind={String(
          (customer as { customer_kind?: string }).customer_kind ?? "retail",
        )}
        initialWholesaleDiscountPercent={Math.max(
          0,
          Math.min(
            100,
            Math.floor(
              Number(
                (customer as { wholesale_discount_percent?: number | null })
                  .wholesale_discount_percent ?? 0,
              ),
            ),
          ),
        )}
        addressRows={
          (addressRows ?? []).map((r) => ({
            label: String(r.label ?? ""),
            address_line: r.address_line,
            reference: r.reference,
          }))
        }
        shippingFallback={
          addressRows && addressRows.length > 0
            ? null
            : customer.shipping_address != null
              ? String(customer.shipping_address)
              : null
        }
      />
    </div>
  );
}
