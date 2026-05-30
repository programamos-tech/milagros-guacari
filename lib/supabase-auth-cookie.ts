import type { NextRequest } from "next/server";

/** Cookie de sesión Supabase (puede venir en chunks `.0`, `.1`, …). */
export function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) => {
    if (!cookie.name.startsWith("sb-")) return false;
    if (!cookie.name.includes("-auth-token")) return false;
    return cookie.value.trim().length > 10;
  });
}
