"use client";

import { usePathname } from "next/navigation";

/**
 * Entrada suave al cambiar de vista en la tienda.
 * Vive en `template.tsx` (se remonta en cada navegación).
 */
export function StorePageEnter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const soft =
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/pedido") ||
    pathname.startsWith("/cart") ||
    pathname.startsWith("/cuenta");

  return (
    <div
      key={pathname}
      className={
        soft
          ? "store-page-enter store-page-enter--soft"
          : "store-page-enter"
      }
    >
      {children}
    </div>
  );
}
