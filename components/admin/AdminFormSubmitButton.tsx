"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/** Botón primario de formularios admin (POS, inventario, clientes). */
export const adminPrimarySubmitButtonClass =
  "rounded-lg border border-rose-950 bg-rose-950 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-900 hover:border-rose-900 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-200 disabled:text-zinc-500 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white dark:disabled:border-zinc-700 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500";

/** Ancho completo en columnas laterales de formularios de alta. */
export const adminPrimarySubmitButtonFullWidthClass = `mt-5 w-full ${adminPrimarySubmitButtonClass}`;

type AdminFormSubmitButtonProps = {
  children: ReactNode;
  pendingLabel?: string;
  disabled?: boolean;
  className?: string;
};

/** Deshabilita el envío mientras la server action está en curso (evita duplicados). */
export function AdminFormSubmitButton({
  children,
  pendingLabel = "Guardando…",
  disabled = false,
  className = adminPrimarySubmitButtonFullWidthClass,
}: AdminFormSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={disabled || pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
