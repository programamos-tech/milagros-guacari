"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureStoreCustomerLinked } from "@/lib/store-customer-service";

type StoreUserMeta = {
  full_name?: string;
  document_id?: string;
};

/** Llama desde layout /cuenta o tras login/registro. No usar revalidatePath aquí: corre durante el render del layout. */
export async function syncStoreCustomerFromSession() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id || !user.email) {
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      return;
    }

    const meta = user.user_metadata as StoreUserMeta | undefined;
    await ensureStoreCustomerLinked(
      user.id,
      user.email,
      meta?.full_name ?? null,
      meta?.document_id ?? null,
    );
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.error("[syncStoreCustomerFromSession]", e);
    }
  }
}
