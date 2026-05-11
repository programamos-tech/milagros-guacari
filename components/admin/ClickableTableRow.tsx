"use client";

import type { KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

/**
 * Fila de tabla que navega al hacer clic o con Enter / espacio (accesible).
 * Quitá el `Link` duplicado en la última celda para evitar anidación rara.
 */
export function ClickableTableRow({
  href,
  ariaLabel = "Abrir detalle",
  className = "",
  children,
}: {
  href: string;
  ariaLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  function go() {
    void router.push(href);
  }

  return (
    <tr
      role="link"
      tabIndex={0}
      aria-label={ariaLabel}
      className={`cursor-pointer outline-none hover:bg-zinc-50/80 focus-visible:bg-zinc-50/80 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400 dark:hover:bg-zinc-800/70 dark:focus-visible:bg-zinc-800/70 dark:focus-visible:ring-zinc-500 ${className}`}
      onClick={go}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      }}
    >
      {children}
    </tr>
  );
}
