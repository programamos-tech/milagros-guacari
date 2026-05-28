import Link from "next/link";
import { storagePublicObjectUrl } from "@/lib/storage-public-url";
import { fetchKitsWithItems } from "@/lib/load-product-kits";
import {
  kitIsAvailable,
  maxKitsAvailableFromItems,
  resolveKitSalePriceCents,
} from "@/lib/product-kits";
import { formatCop } from "@/lib/money";
import { loadAdminPermissions } from "@/lib/load-admin-permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminKitsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createSupabaseServerClient();
  const perm = await loadAdminPermissions();
  const canEdit = Boolean(perm?.permissions.kits_gestionar);
  const sp = await searchParams;
  const created = sp.created === "1";

  const kits = await fetchKitsWithItems(supabase);

  return (
    <div className="w-full min-w-0 space-y-6">
      {created ? (
        <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-100">
          Kit creado correctamente.
        </p>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-500">
            <Link href="/admin" className="hover:text-zinc-800 dark:hover:text-zinc-200">
              Reportes
            </Link>
            <span className="mx-1.5">/</span>
            <span>Kits y combos</span>
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Kits y combos
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500">
            Armá combos de varios productos. Solo se muestran en tienda y ventas si hay stock
            suficiente para armarlos.
          </p>
        </div>
        {canEdit ? (
          <Link
            href="/admin/kits/nuevo"
            className="inline-flex rounded-lg border border-rose-950 bg-rose-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-900"
          >
            + Nuevo kit
          </Link>
        ) : null}
      </div>

      {kits.length === 0 ? (
        <p className="text-sm text-zinc-500">Todavía no hay kits. Creá el primero.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {kits.map((kit) => {
            const items = kit.items ?? [];
            const maxPos = maxKitsAvailableFromItems(items, "pos");
            const maxStore = maxKitsAvailableFromItems(items, "storefront");
            const available = kitIsAvailable(kit, "pos");
            const price = resolveKitSalePriceCents(kit, items, "pos");
            const img = storagePublicObjectUrl(kit.image_path);
            return (
              <li
                key={kit.id}
                className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt="" className="mb-3 h-28 w-full rounded-lg object-cover" />
                ) : null}
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">{kit.name}</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {items.length} producto{items.length === 1 ? "" : "s"} · {formatCop(price)}
                </p>
                <p className="mt-2 text-xs">
                  <span
                    className={
                      available
                        ? "font-medium text-emerald-700"
                        : "font-medium text-amber-800"
                    }
                  >
                    {available ? "Disponible" : "Sin stock para armar"}
                  </span>
                  {" · "}
                  POS: {maxPos} · Web: {maxStore}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  {kit.is_published ? "Publicado" : "Borrador"}
                </p>
                <Link
                  href={`/admin/kits/${kit.id}/edit`}
                  className="mt-3 inline-block text-sm font-medium text-rose-900 hover:underline dark:text-rose-300"
                >
                  {canEdit ? "Editar" : "Ver"}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
