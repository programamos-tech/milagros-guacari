"use client";

import { useEffect } from "react";
import { useStoreAuthModals } from "@/components/store/StoreAuthModals";

export default function CuentaRegistroPage() {
  const { openRegister } = useStoreAuthModals();

  useEffect(() => {
    openRegister();
  }, [openRegister]);

  return (
    <div className="min-h-[50vh]" aria-hidden>
      {/* El formulario se muestra en el modal global sobre la tienda. */}
    </div>
  );
}
