import Link from "next/link";
import { StoreShippingMunicipalitiesTable } from "@/components/admin/StoreShippingForms";
import type { StoreShippingMunicipalityRow } from "@/lib/store-shipping";
import { storeShippingAdminErrorMessage } from "@/lib/store-shipping";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminEnviosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const errCode = typeof sp.envios_error === "string" ? sp.envios_error : undefined;
  const errMsg = storeShippingAdminErrorMessage(errCode);

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("store_shipping_municipalities")
    .select(
      "id, name, department, rate_cents, is_enabled, sort_order, created_at, updated_at",
    )
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const rows = (data ?? []) as StoreShippingMunicipalityRow[];

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <Link href="/admin" className="hover:text-zinc-800 dark:hover:text-zinc-200">
              Reportes
            </Link>
            <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">/</span>
            <span className="text-zinc-700 dark:text-zinc-300">Envíos</span>
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl md:text-3xl">
            Envíos por municipio
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Configura el precio de envío de cada municipio. En la tienda el cliente elige su
            ciudad y ve el costo. Si no aparece, lo invitamos a escribir por WhatsApp.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/envios/nuevo"
            className="inline-flex items-center justify-center rounded-lg border border-rose-950 bg-rose-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-900 hover:border-rose-900 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            + Nuevo municipio
          </Link>
        </div>
      </div>

      {errMsg ? (
        <p
          className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100"
          role="alert"
        >
          {errMsg}
        </p>
      ) : null}

      <StoreShippingMunicipalitiesTable rows={rows} />
    </div>
  );
}
