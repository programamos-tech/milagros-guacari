import type { ReactNode } from "react";

/** Contenedor ancho completo para pantallas de creación en admin (sin max-width). */
export function AdminNewPageShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`w-full min-w-0 ${className}`.trim()}>{children}</div>;
}
