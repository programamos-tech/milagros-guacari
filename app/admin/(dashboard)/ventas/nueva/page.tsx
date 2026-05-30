import { NewInvoiceForm, NewInvoiceHeader } from "@/components/admin/NewInvoiceForm";
import { AdminNewPageShell } from "@/components/admin/AdminNewPageShell";
import { requireAdminPermission } from "@/lib/require-admin-permission";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminNuevaFacturaPage({ searchParams }: Props) {
  await requireAdminPermission("ventas_crear");
  const sp = await searchParams;
  const initialError = typeof sp.error === "string" ? sp.error : undefined;

  return (
    <AdminNewPageShell>
      <NewInvoiceHeader />
      <NewInvoiceForm initialError={initialError} />
    </AdminNewPageShell>
  );
}
