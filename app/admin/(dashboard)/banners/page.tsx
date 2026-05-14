import { BannersAdminPanel } from "@/components/admin/BannersAdminPanel";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchAllBannersAdmin } from "@/lib/store-banners";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function AdminBannersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const errorCode = typeof sp.error === "string" ? sp.error : undefined;

  const supabase = await createSupabaseServerClient();
  const banners = await fetchAllBannersAdmin(supabase);

  return (
    <div className="w-full min-w-0">
      <div className="border-b border-zinc-100 pb-6 dark:border-zinc-800">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl md:text-3xl">
          Banners
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Sube imágenes para el hero del inicio y para la parte superior del catálogo. Puedes tener
          varias por ubicación; en la tienda se muestran en carrusel con autoplay.
        </p>
      </div>

      <div className="pt-6">
        <BannersAdminPanel banners={banners} errorCode={errorCode} />
      </div>
    </div>
  );
}
