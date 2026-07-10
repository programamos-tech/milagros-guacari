"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { storeBrand } from "@/lib/brand";

export const STORE_CHECKOUT_ROUTE_MESSAGES = [
  "Llevándote a finalizar tu compra…",
  "Preparando tu bolsa con cariño…",
  "Casi listo, un momentito…",
  "Revisando tus productos…",
  "Gracias por elegirnos…",
] as const;

export const STORE_CHECKOUT_SUBMIT_MESSAGES = [
  "Estamos preparando tu pedido con cariño…",
  "Revisando tu bolsa y el envío…",
  "Casi listo, un momentito…",
  "Confirmando disponibilidad de tus productos…",
  "Gracias por confiar en nosotros…",
  "Tu pedido está tomando forma…",
] as const;

type Props = {
  active: boolean;
  messages: readonly string[];
  footnote?: string;
  zIndexClass?: string;
};

/**
 * Overlay motivacional reutilizable (checkout, bolsa → pagar, etc.).
 */
export function StoreMotivationalOverlay({
  active,
  messages,
  footnote = "No cierres esta ventana; te llevamos al siguiente paso enseguida.",
  zIndexClass = "z-[100]",
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!active) {
      setMsgIdx(0);
      setFade(true);
      return;
    }
    let fadeTimer: number | undefined;
    const id = window.setInterval(() => {
      setFade(false);
      fadeTimer = window.setTimeout(() => {
        setMsgIdx((i) => (i + 1) % messages.length);
        setFade(true);
      }, 220);
    }, 2200);
    return () => {
      window.clearInterval(id);
      if (fadeTimer != null) window.clearTimeout(fadeTimer);
    };
  }, [active, messages.length]);

  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);

  if (!mounted || !active || messages.length === 0) return null;

  return createPortal(
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center bg-[#fff8fb]/95 px-6 backdrop-blur-sm`}
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
            {messages[msgIdx] ?? messages[0]}
          </p>
          {footnote ? (
            <p className="mt-3 text-[12px] leading-relaxed text-stone-500">
              {footnote}
            </p>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
