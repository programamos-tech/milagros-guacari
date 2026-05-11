"use client";

import { useEffect } from "react";
import { useStoreAuthModals } from "@/components/store/StoreAuthModals";

/** En `/cuenta/entrar` abre el panel lateral de login (misma UX que el ícono de usuario). */
export function CuentaGuestLoginLauncher() {
  const { openLogin } = useStoreAuthModals();

  useEffect(() => {
    openLogin();
  }, [openLogin]);

  return <div className="min-h-[40vh]" aria-hidden />;
}
