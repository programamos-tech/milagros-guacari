"use client";

import { useState } from "react";

export function TeamRolesInfoCollapse({ storeLabel }: { storeLabel: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-none dark:ring-white/[0.06]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 md:px-6 dark:text-zinc-200 dark:hover:bg-zinc-800/60"
        aria-expanded={open}
      >
        <span>Quién puede hacer qué en {storeLabel}</span>
        <svg
          viewBox="0 0 24 24"
          className={`size-5 shrink-0 text-zinc-500 transition dark:text-zinc-400 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div className="border-t border-zinc-100 px-5 pb-5 pt-2 text-sm leading-relaxed text-zinc-600 dark:border-zinc-800 dark:text-zinc-300 md:px-6">
          <p>
            Los <strong className="text-zinc-800 dark:text-zinc-100">dueños</strong> tienen acceso
            completo. Los{" "}
            <strong className="text-zinc-800 dark:text-zinc-100">cajeros</strong> registran ventas
            y caja con permisos acotados. El rol{" "}
            <strong className="text-zinc-800 dark:text-zinc-100">apoyo</strong> sirve para quien
            refuerza inventario u operación sin ser el titular; partís del paquete sugerido y afinás
            permisos en cada ficha.
          </p>
          <p className="mt-3">
            Los permisos se guardan por colaborador; puedes ajustarlos y usar{" "}
            <strong className="text-zinc-800 dark:text-zinc-100">Restaurar por rol</strong> para
            volver al paquete sugerido del rol elegido.
          </p>
        </div>
      ) : null}
    </div>
  );
}
