import { StoreWelcomeModalPanel } from "@/components/admin/StoreWelcomeModalPanel";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { StoreWelcomeModalRow } from "@/lib/store-welcome-modal";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const welcomeError =
    typeof sp.welcome_error === "string" ? sp.welcome_error : undefined;
  const supabase = await createSupabaseServerClient();
  const { data: modals } = await supabase
    .from("store_welcome_modals")
    .select(
      "id,title,description,image_path,discount_code,cta_label,cta_href,is_enabled,sort_order,created_at",
    )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <div className="w-full min-w-0 space-y-6">
      <StoreWelcomeModalPanel
        modals={(modals as StoreWelcomeModalRow[] | null) ?? []}
        errorCode={welcomeError}
      />
    </div>
  );
}
