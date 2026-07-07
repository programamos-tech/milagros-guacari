"use client";

import { useEffect, useState } from "react";
import { useStoreAuthModals } from "@/components/store/StoreAuthModals";
import { storeAuthFormOutlineBtnClass } from "@/components/store/store-auth-form-primitives";

function dismissKey(orderId: string) {
  return `tiendas_post_checkout_register_dismissed_${orderId}`;
}

export function StorePostCheckoutRegisterModal({
  orderId,
  open,
}: {
  orderId: string;
  open: boolean;
}) {
  const { openRegister } = useStoreAuthModals();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) return;
    try {
      if (sessionStorage.getItem(dismissKey(orderId)) === "1") return;
    } catch {
      /* ignore */
    }
    const timer = window.setTimeout(() => setVisible(true), 1200);
    return () => window.clearTimeout(timer);
  }, [open, orderId]);

  if (!visible) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(dismissKey(orderId), "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-checkout-register-title"
        className="relative w-full max-w-md overflow-hidden border border-stone-200 bg-white shadow-[0_30px_80px_-30px_rgba(0,0,0,0.45)]"
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 flex size-8 items-center justify-center text-stone-500 transition hover:text-[var(--store-accent)]"
          aria-label="Cerrar"
        >
          <span className="text-lg leading-none">×</span>
        </button>
        <div className="space-y-4 px-6 pb-7 pt-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--store-brand)]">
            Creá tu cuenta
          </p>
          <h2
            id="post-checkout-register-title"
            className="pr-6 text-xl font-semibold leading-snug text-stone-900"
          >
            Registrate y aprovechá promociones y descuentos
          </h2>
          <p className="text-sm leading-relaxed text-stone-600">
            Guardá tus pedidos, direcciones y recibí ofertas exclusivas para clientes
            registrados.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                dismiss();
                openRegister();
              }}
              className="inline-flex w-full items-center justify-center border border-[var(--store-accent)] bg-[var(--store-accent)] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--store-accent-hover)]"
            >
              Crear cuenta gratis
            </button>
            <button type="button" onClick={dismiss} className={storeAuthFormOutlineBtnClass}>
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
