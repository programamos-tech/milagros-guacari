"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useFormStatus } from "react-dom";
import { storeBrand } from "@/lib/brand";

const CHECKOUT_LOADING_MESSAGES = [
  "Estamos preparando tu pedido con cariño…",
  "Revisando tu bolsa y el envío…",
  "Casi listo, un momentito…",
  "Confirmando disponibilidad de tus productos…",
  "Gracias por confiar en nosotros…",
  "Tu pedido está tomando forma…",
] as const;

/**
 * Overlay a pantalla completa mientras corre `startCheckout`.
 * Debe vivir dentro del `<form>` (usa `useFormStatus`).
 */
export function CheckoutSubmittingOverlay() {
  const { pending } = useFormStatus();
  const [mounted, setMounted] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!pending) {
      setMsgIdx(0);
      setFade(true);
      return;
    }
    let fadeTimer: number | undefined;
    const id = window.setInterval(() => {
      setFade(false);
      fadeTimer = window.setTimeout(() => {
        setMsgIdx((i) => (i + 1) % CHECKOUT_LOADING_MESSAGES.length);
        setFade(true);
      }, 220);
    }, 2600);
    return () => {
      window.clearInterval(id);
      if (fadeTimer != null) window.clearTimeout(fadeTimer);
    };
  }, [pending]);

  useEffect(() => {
    if (!pending) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [pending]);

  if (!mounted || !pending) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#fff8fb]/95 px-6 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative w-full max-w-sm text-center">
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--store-accent)]/10 blur-2xl"
          aria-hidden
        />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--store-brand)]">
            {storeBrand}
          </p>

          <div className="mx-auto mt-8 flex size-14 items-center justify-center">
            <span
              className="size-11 animate-spin rounded-full border-[3px] border-[var(--store-accent)]/25 border-t-[var(--store-accent)]"
              aria-hidden
            />
          </div>

          <p
            className={`mt-8 min-h-[3.25rem] text-base font-medium leading-snug text-stone-800 transition-opacity duration-200 ${
              fade ? "opacity-100" : "opacity-0"
            }`}
          >
            {CHECKOUT_LOADING_MESSAGES[msgIdx]}
          </p>
          <p className="mt-3 text-[12px] leading-relaxed text-stone-500">
            No cierres esta ventana; te llevamos al siguiente paso enseguida.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
