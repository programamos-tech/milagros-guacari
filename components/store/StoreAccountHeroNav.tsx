"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const linkClass =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90 transition hover:text-white";
const activeClass = "underline decoration-white underline-offset-8";

export function StoreAccountHeroNav({ className = "" }: { className?: string }) {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav
      aria-label="Secciones de cuenta"
      className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:gap-x-10 ${className}`}
    >
      <Link
        href="/cuenta"
        className={`${linkClass} ${isActive("/cuenta", true) ? activeClass : ""}`}
      >
        Resumen
      </Link>
      <Link
        href="/cuenta/pedidos"
        className={`${linkClass} ${isActive("/cuenta/pedidos") ? activeClass : ""}`}
      >
        Pedidos
      </Link>
      <Link
        href="/favoritos"
        className={`${linkClass} ${isActive("/favoritos") ? activeClass : ""}`}
      >
        Favoritos
      </Link>
      <Link
        href="/products"
        className={`${linkClass} ${pathname === "/products" || pathname.startsWith("/products/") ? activeClass : ""}`}
      >
        Exclusivos
      </Link>
      <Link
        href="/cuenta/direcciones"
        className={`${linkClass} ${isActive("/cuenta/direcciones") ? activeClass : ""}`}
      >
        Ajustes
      </Link>
    </nav>
  );
}
