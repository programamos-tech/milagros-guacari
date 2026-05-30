import { NewInvoiceForm, NewInvoiceHeader } from "@/components/admin/NewInvoiceForm";
import { AdminNewPageShell } from "@/components/admin/AdminNewPageShell";
import { requireAdminPermission } from "@/lib/require-admin-permission";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ error?: string; customer?: string }>;
};

export default async function AdminNuevaFacturaPage({ searchParams }: Props) {
  await requireAdminPermission("ventas_crear");
  const sp = await searchParams;
  const initialError = typeof sp.error === "string" ? sp.error : undefined;
  const initialCustomerId =
    typeof sp.customer === "string" && sp.customer.trim().length > 0
      ? sp.customer.trim()
      : undefined;

  return (
    <AdminNewPageShell>
      <NewInvoiceHeader />
      <NewInvoiceForm
        initialError={initialError}
        initialCustomerId={initialCustomerId}
      />
    </AdminNewPageShell>
  );
}
