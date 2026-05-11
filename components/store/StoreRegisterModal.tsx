"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { StoreRegisterForm } from "@/components/store/StoreRegisterForm";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Tras registro con sesión inmediata (sin confirmar email). */
  onRegistered: () => void;
  onOpenLogin: () => void;
};

export function StoreRegisterModal({
  open,
  onClose,
  onRegistered,
  onOpenLogin,
}: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  const dismiss = useCallback(() => {
    onClose();
    if (pathname === "/cuenta/registro") {
      router.replace("/");
    }
  }, [onClose, pathname, router]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        dismiss();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismiss]);

  useEffect(() => {
    if (open) {
      panelRef.current?.querySelector<HTMLElement>("input")?.focus();
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar"
        className="store-cart-drawer-backdrop fixed inset-0 z-[78] bg-black/45"
        onClick={dismiss}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="store-cart-drawer-panel fixed inset-y-0 right-0 z-[80] flex w-[min(100%,26rem)] flex-col bg-white shadow-[-12px_0_48px_rgba(15,23,42,0.12)]"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-stone-200/80 px-6 py-5 sm:px-8">
          <h2
            id={titleId}
            className="pr-8 text-[12px] font-semibold uppercase tracking-[0.18em] text-stone-900 sm:text-sm"
          >
            Crear cuenta
          </h2>
          <button
            type="button"
            onClick={dismiss}
            className="flex size-9 shrink-0 items-center justify-center border border-stone-900/80 text-stone-900 transition hover:bg-stone-900 hover:text-white"
            aria-label="Cerrar"
          >
            <span className="text-lg font-light leading-none">×</span>
          </button>
        </header>

        <div className="store-cart-drawer-body-scroll flex min-h-0 flex-1 flex-col px-6 pb-8 pt-6 sm:px-8">
          <p className="text-sm leading-relaxed text-stone-600">
            Regístrate con tu correo para guardar direcciones y seguir tus pedidos.
          </p>

          <div className="mt-8">
            <StoreRegisterForm onSuccess={onRegistered} />
          </div>

          <p className="mt-8 text-center text-sm text-stone-600">
            ¿Ya tienes cuenta?{" "}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenLogin();
              }}
              className="font-medium text-[var(--store-accent)] underline decoration-stone-300 underline-offset-4 hover:text-[var(--store-accent-hover)]"
            >
              Iniciar sesión
            </button>
          </p>
          <p className="mt-4 text-center text-sm">
            <button
              type="button"
              onClick={dismiss}
              className="text-stone-500 underline decoration-stone-200 underline-offset-4 transition hover:text-stone-800"
            >
              ← Volver a la tienda
            </button>
          </p>
        </div>
      </div>
    </>
  );
}
