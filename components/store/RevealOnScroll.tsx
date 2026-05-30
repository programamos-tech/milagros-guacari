import type { ReactNode } from "react";

/** Wrapper sin animación — mantiene la API para no tocar cada listado. */
export function RevealOnScroll({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
  /** Ignorado (sin animación). */
  delayMs?: number;
}) {
  return <div className={className.trim()}>{children}</div>;
}
