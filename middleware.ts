import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const cuentaPublicPaths = new Set(["/cuenta/entrar", "/cuenta/registro"]);

const PUBLIC_STORE_STATIC = new Set([
  "/terminos",
  "/cookies",
  "/privacidad",
  "/quien-soy",
]);

/** Catálogo y páginas de tienda sin auth en middleware (header/cuenta cargan sesión si hace falta). */
function isPublicStorePath(path: string): boolean {
  if (path === "/") return true;
  if (path === "/products" || path.startsWith("/products/")) return true;
  if (path === "/kits" || path.startsWith("/kits/")) return true;
  if (path === "/favoritos" || path === "/cart") return true;
  if (path === "/checkout" || path.startsWith("/checkout/")) return true;
  if (PUBLIC_STORE_STATIC.has(path)) return true;
  if (path.startsWith("/api/store/")) return true;
  return false;
}

/** Rutas públicas sin sesión Supabase en middleware (menos latencia). */
function skipsMiddlewareAuth(path: string): boolean {
  return (
    path.startsWith("/api/products/") ||
    path.startsWith("/api/webhooks/") ||
    path === "/icon.svg" ||
    isPublicStorePath(path)
  );
}

function isCuentaPath(path: string) {
  return path === "/cuenta" || path.startsWith("/cuenta/");
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (skipsMiddlewareAuth(path)) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  let user: User | null = null;
  let supabase: ReturnType<typeof createServerClient> | null = null;

  if (supabaseUrl && supabaseAnonKey) {
    try {
      supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      });

      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("[middleware] auth.getUser:", error.message);
      }
      user = data.user ?? null;
    } catch (e) {
      console.error("[middleware] Supabase client / getUser failed:", e);
      supabase = null;
      user = null;
    }
  } else {
    console.error(
      "[middleware] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Define them in Vercel → Settings → Environment Variables (all environments) and redeploy.",
    );
  }

  if (isCuentaPath(path)) {
    const { data: profile } =
      user && supabase
        ? await supabase
            .from("profiles")
            .select("id")
            .eq("id", user.id)
            .maybeSingle()
        : { data: null };

    if (user && profile && cuentaPublicPaths.has(path)) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    if (!cuentaPublicPaths.has(path) && !user) {
      const next = new URL("/cuenta/entrar", request.url);
      next.searchParams.set("next", path + request.nextUrl.search);
      return NextResponse.redirect(next);
    }

    if (cuentaPublicPaths.has(path) && user && !profile) {
      return NextResponse.redirect(new URL("/cuenta", request.url));
    }
  }

  if (path.startsWith("/admin/login")) {
    if (user && supabase) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (profile) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      const hasNoProfileError =
        request.nextUrl.searchParams.get("error") === "no_profile";
      if (!hasNoProfileError) {
        const next = new URL("/admin/login", request.url);
        next.searchParams.set("error", "no_profile");
        next.searchParams.set("uid", user.id);
        if (user.email) next.searchParams.set("email", user.email);
        return NextResponse.redirect(next);
      }
    }
    return response;
  }

  if (path.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    if (!supabase) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile) {
      const next = new URL("/admin/login", request.url);
      next.searchParams.set("error", "no_profile");
      next.searchParams.set("uid", user.id);
      if (user.email) next.searchParams.set("email", user.email);
      return NextResponse.redirect(next);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
