import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const cuentaPublicPaths = new Set(["/cuenta/entrar", "/cuenta/registro"]);

function isCuentaPath(path: string) {
  return path === "/cuenta" || path.startsWith("/cuenta/");
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Refresca la sesión en cookies antes de Server Components (tienda, productos, etc.).
  // Si solo corre en /cuenta y /admin, las rutas como /products pueden ir con JWT
  // desincronizado y Supabase devuelve errores en consultas pese a que el cliente muestre sesión.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (isCuentaPath(path)) {
    const { data: profile } = user
      ? await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle()
      : { data: null };

    // Staff usa el enlace "Backoffice" del footer; aquí no redirigimos a /admin.
    // Las páginas de registro/login de la tienda no aplican si ya hay sesión de admin.
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
    if (user) {
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
        return NextResponse.redirect(
          next,
        );
      }
    }
    return response;
  }

  if (path.startsWith("/admin")) {
    if (!user) {
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
      return NextResponse.redirect(
        next,
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
