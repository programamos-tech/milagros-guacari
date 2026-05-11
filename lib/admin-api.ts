import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Sesión admin para rutas `/api/admin/*` (el middleware no cubre `/api`). */
export async function requireAdminApiSession(): Promise<
  | { ok: true; supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Prohibido" }, { status: 403 }),
    };
  }
  return { ok: true, supabase };
}
