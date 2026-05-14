"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { updateStoreCustomerBirthDateAction } from "@/app/actions/store-customer-birthday";

const STORAGE_KEY = "tiendas_account_bday_banner_dismissed";

function readDismissedFromStorage(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

const inputClass =
  "w-full max-w-[11.5rem] rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 shadow-[0_1px_0_0_rgb(24_24_27/0.04)] focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-400/25";

const btnPrimary =
  "inline-flex shrink-0 items-center justify-center border border-[var(--store-accent)] bg-[var(--store-accent)] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--store-accent-hover)] disabled:opacity-50";

const btnGhost =
  "inline-flex shrink-0 items-center justify-center border border-stone-300 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-700 transition hover:bg-stone-50";

/**
 * Solo compradores (`birthDate` distinto de `undefined`). Si ya hay fecha en DB, no se muestra.
 * La fecha se guarda en `public.customers.birth_date` vía RLS del dueño de la tienda.
 */
export function StoreAccountBirthdayBanner({ birthDate }: { birthDate: string | null }) {
  const [localDismissed, setLocalDismissed] = useState(false);
  const [editing, setEditing] = useState(false);
  const searchParams = useSearchParams();
  const cumple = searchParams.get("cumple");

  const storedDismissed = useSyncExternalStore(
    () => () => {},
    readDismissedFromStorage,
    () => false,
  );

  const maxDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  if (birthDate) return null;
  if (storedDismissed || localDismissed) return null;

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setLocalDismissed(true);
  }

  const flashErr =
    cumple === "invalid" || cumple === "db" || cumple === "forbidden";

  return (
    <div className="relative border-b border-stone-200/80 bg-[#f4f4f3]">
      <div className="mx-auto flex max-w-7xl flex-col items-stretch gap-6 px-4 py-6 sm:flex-row sm:items-center sm:gap-10 sm:px-6 lg:px-8">
        <div className="relative mx-auto h-20 w-28 shrink-0 sm:mx-0 sm:h-24 sm:w-32">
          <Image
            src="https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&q=80&auto=format&fit=crop"
            alt=""
            fill
            className="object-cover"
            sizes="128px"
          />
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--store-brand)]">
            Agrega tu cumpleaños
          </p>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            Cuéntanos tu fecha y te saludamos cada año con algo especial. Queda guardada solo en tu
            perfil de cliente.
          </p>
          <p className="mt-3 text-xs text-stone-500">
            También podés cambiarla en{" "}
            <Link
              href="/cuenta/direcciones"
              className="font-medium text-stone-800 underline decoration-stone-400 underline-offset-2 hover:text-stone-950"
            >
              Ajustes
            </Link>
            .
          </p>
          {flashErr ? (
            <p className="mt-3 rounded-lg border border-red-200/90 bg-red-50/90 px-3 py-2 text-xs font-medium text-red-900">
              {cumple === "invalid"
                ? "Revisá la fecha (debe ser válida y no futura)."
                : cumple === "forbidden"
                  ? "Esta acción no está disponible para tu tipo de usuario."
                  : "No pudimos guardar. Intentá de nuevo o escribinos por WhatsApp."}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-center gap-3 sm:items-end">
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="border border-[var(--store-accent)] bg-white px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--store-accent)] transition hover:bg-[var(--store-accent)] hover:text-white"
            >
              Actualizar
            </button>
          ) : (
            <form
              action={updateStoreCustomerBirthDateAction}
              className="flex w-full max-w-sm flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:items-end sm:justify-end"
            >
              <input type="hidden" name="next" value="/cuenta" readOnly />
              <div className="flex flex-col gap-1 sm:min-w-0">
                <label htmlFor="store-bday-input" className="sr-only">
                  Fecha de cumpleaños
                </label>
                <input
                  id="store-bday-input"
                  type="date"
                  name="birth_date"
                  required
                  min="1900-01-01"
                  max={maxDate}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-wrap justify-center gap-2 sm:justify-end">
                <button type="submit" className={btnPrimary}>
                  Guardar
                </button>
                <button type="button" className={btnGhost} onClick={() => setEditing(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 flex size-8 items-center justify-center text-stone-500 transition hover:text-[var(--store-accent)] sm:right-4 sm:top-4"
          aria-label="Cerrar"
        >
          <span className="text-lg leading-none">×</span>
        </button>
      </div>
    </div>
  );
}
