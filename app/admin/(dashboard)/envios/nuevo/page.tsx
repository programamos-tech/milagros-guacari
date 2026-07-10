import {
  NewShippingMunicipalityForm,
  NewShippingMunicipalityHeader,
} from "@/components/admin/StoreShippingForms";
import { AdminNewPageShell } from "@/components/admin/AdminNewPageShell";
import { storeShippingAdminErrorMessage } from "@/lib/store-shipping";

export const dynamic = "force-dynamic";

export default async function AdminNuevoEnvioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const errCode = typeof sp.envios_error === "string" ? sp.envios_error : undefined;
  const errMsg = storeShippingAdminErrorMessage(errCode);

  return (
    <AdminNewPageShell>
      <NewShippingMunicipalityHeader />
      {errMsg ? (
        <p
          className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100"
          role="alert"
        >
          {errMsg}
        </p>
      ) : null}
      <NewShippingMunicipalityForm />
    </AdminNewPageShell>
  );
}
