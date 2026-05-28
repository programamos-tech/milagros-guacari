import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteKitAction } from "@/app/actions/admin/kits";
import { KitForm } from "@/components/admin/KitForm";
import { fetchKitWithItems } from "@/lib/load-product-kits";
import { kitFormErrorMessage } from "@/lib/kit-form-errors";
import { loadAdminPermissions } from "@/lib/load-admin-permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminEditKitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const saved = sp.saved === "1";
  const banner = kitFormErrorMessage(error);
  const supabase = await createSupabaseServerClient();
  const kit = await fetchKitWithItems(supabase, id);
  if (!kit) notFound();

  const perm = await loadAdminPermissions();
  const canEdit = Boolean(perm?.permissions.kits_gestionar);

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-500">
            <Link href="/admin/kits">Kits</Link>
            <span className="mx-1.5">/</span>
            <span>{kit.name}</span>
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Editar kit</h1>
        </div>
        {canEdit ? (
          <form action={deleteKitAction}>
            <input type="hidden" name="kit_id" value={kit.id} />
            <button
              type="submit"
              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Eliminar kit
            </button>
          </form>
        ) : null}
      </div>
      {saved ? (
        <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-100">
          Cambios guardados.
        </p>
      ) : null}
      {banner ? (
        <p
          className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100"
          role="alert"
        >
          {banner}
        </p>
      ) : null}
      <KitForm mode="edit" kit={kit} canEdit={canEdit} />
    </div>
  );
}
