import { notFound } from "next/navigation";
import {
  EditShippingMunicipalityForm,
  EditShippingMunicipalityHeader,
} from "@/components/admin/StoreShippingForms";
import { AdminNewPageShell } from "@/components/admin/AdminNewPageShell";
import type { StoreShippingMunicipalityRow } from "@/lib/store-shipping";
import { storeShippingAdminErrorMessage } from "@/lib/store-shipping";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminEditarEnvioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const errCode = typeof sp.envios_error === "string" ? sp.envios_error : undefined;
  const errMsg = storeShippingAdminErrorMessage(errCode);

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("store_shipping_municipalities")
    .select(
      "id, name, department, rate_cents, is_enabled, sort_order, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const row = data as StoreShippingMunicipalityRow;

  return (
    <AdminNewPageShell>
      <EditShippingMunicipalityHeader name={row.name} />
      {errMsg ? (
        <p
          className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100"
          role="alert"
        >
          {errMsg}
        </p>
      ) : null}
      <EditShippingMunicipalityForm row={row} />
    </AdminNewPageShell>
  );
}
