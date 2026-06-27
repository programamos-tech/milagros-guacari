import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Sesión admin para rutas `/api/admin/*` (el middleware no cubre `/api`).
 * Usa getSession (JWT local) en lugar de getUser para evitar un round-trip
 * extra al servidor de auth en cada búsqueda del POS.
 */
export async function requireAdminApiSession(): Promise<
  | { ok: true; supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Prohibido" }, { status: 403 }),
    };
  }

  return { ok: true, supabase };
}
