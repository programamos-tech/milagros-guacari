import Link from "next/link";
import { KitForm } from "@/components/admin/KitForm";
import { kitFormErrorMessage } from "@/lib/kit-form-errors";
import { requireAdminPermission } from "@/lib/require-admin-permission";

export default async function AdminNewKitPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPermission("kits_gestionar");
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const banner = kitFormErrorMessage(error);

  return (
    <div className="w-full min-w-0 space-y-6">
      <div>
        <p className="text-xs text-zinc-500">
          <Link href="/admin/kits">Kits</Link>
          <span className="mx-1.5">/</span>
          <span>Nuevo</span>
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Nuevo kit</h1>
      </div>
      {banner ? (
        <p
          className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100"
          role="alert"
        >
          {banner}
        </p>
      ) : null}
      <KitForm mode="create" canEdit />
    </div>
  );
}
