"use client";

import { useState } from "react";

export function StoreOrderTrackingLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--store-brand)]">
        Seguimiento de tu pedido
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        Guardá este enlace para consultar el estado cuando quieras. Podés pegarlo en el
        navegador o enviártelo por WhatsApp.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <input
          type="text"
          readOnly
          value={url}
          aria-label="Enlace de seguimiento del pedido"
          className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-xs text-stone-800 sm:text-sm"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex shrink-0 items-center justify-center border border-[var(--store-accent)] bg-white px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--store-accent)] transition hover:bg-[var(--store-accent)] hover:text-white"
        >
          {copied ? "Copiado" : "Copiar enlace"}
        </button>
      </div>
    </section>
  );
}
