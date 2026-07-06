import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextRaw = url.searchParams.get("next") ?? "/cuenta";
  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/cuenta";

  const authError = url.searchParams.get("error");
  const authErrorDescription = url.searchParams.get("error_description");

  if (authError) {
    const redirect = new URL("/cuenta/entrar", url.origin);
    redirect.searchParams.set("auth_error", authError);
    if (authErrorDescription) {
      redirect.searchParams.set("auth_message", authErrorDescription);
    }
    return NextResponse.redirect(redirect);
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  return NextResponse.redirect(new URL("/cuenta/entrar?auth_error=callback", url.origin));
}
