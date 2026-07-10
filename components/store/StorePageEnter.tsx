"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const FLASH_EVENT = "store:flash";

/** Dispara un flash corto de entrada (logo en home, etc.). */
export function flashStorePageEnter() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(FLASH_EVENT));
}

/**
 * Entrada cortita al cargar / cambiar de vista.
 * Vive en `template.tsx` (se remonta en cada navegación).
 */
export function StorePageEnter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const [flashTick, setFlashTick] = useState(0);

  useEffect(() => {
    const onFlash = () => setFlashTick((n) => n + 1);
    window.addEventListener(FLASH_EVENT, onFlash);
    return () => window.removeEventListener(FLASH_EVENT, onFlash);
  }, []);

  return (
    <div
      key={`${pathname}:${flashTick}`}
      className="store-page-enter"
    >
      {children}
    </div>
  );
}
