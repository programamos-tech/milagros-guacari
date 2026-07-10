"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useCheckoutShipping } from "@/components/store/CheckoutShippingProvider";
import { formatCop } from "@/lib/money";
import {
  formatShippingRateLabel,
  municipalityDisplayLabel,
  SHIPPING_CITY_OTHER,
} from "@/lib/store-shipping";
import { storeWhatsAppUrl } from "@/lib/brand";

const triggerClass =
  "flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-stone-300 bg-white py-3 pl-4 pr-3.5 text-left text-[13px] text-stone-900 shadow-sm outline-none transition hover:border-stone-400 focus:border-[var(--store-accent)] focus:ring-2 focus:ring-[var(--store-accent)]/20";

export function CheckoutCitySelect({
  labelClass,
  required = true,
}: {
  labelClass: string;
  inputClass: string;
  selectClass?: string;
  required?: boolean;
}) {
  const {
    municipalities,
    cityValue,
    setCityValue,
    selectedMunicipality,
    isOtherCity,
    shippingCents,
    freeShippingQualified,
  } = useCheckoutShipping();

  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (ev: MouseEvent) => {
      const t = ev.target as Node;
      if (rootRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const waHref =
    storeWhatsAppUrl === "#"
      ? null
      : `${storeWhatsAppUrl}?text=${encodeURIComponent(
          "Hola, quiero hacer un pedido pero mi municipio no aparece en las opciones de envío de la tienda.",
        )}`;

  const triggerLabel = isOtherCity
    ? "Mi municipio no aparece"
    : selectedMunicipality
      ? municipalityDisplayLabel(selectedMunicipality)
      : "Selecciona tu municipio…";

  function pick(value: string) {
    setCityValue(value);
    setOpen(false);
  }

  return (
    <div className="space-y-3">
      <div ref={rootRef} className="relative">
        <span className={labelClass} id={`${listId}-label`}>
          Municipio / ciudad de envío
        </span>

        <input
          type="hidden"
          name="shipping_municipality_id"
          value={cityValue}
          required={required}
        />
        <input
          type="hidden"
          name="city"
          value={isOtherCity ? "" : (selectedMunicipality?.name ?? "")}
          readOnly
        />

        <button
          type="button"
          className={`${triggerClass} mt-1.5`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={`${listId}-label`}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={cityValue ? "text-stone-900" : "text-stone-400"}>
            {triggerLabel}
          </span>
          <svg
            viewBox="0 0 24 24"
            className={`size-[18px] shrink-0 text-stone-500 transition ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open ? (
          <ul
            id={listId}
            role="listbox"
            aria-labelledby={`${listId}-label`}
            className="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-stone-200 bg-white py-1.5 shadow-[0_12px_40px_-12px_rgb(24_24_27/0.28)]"
          >
            {municipalities.map((m) => {
              const selected = cityValue === m.id;
              return (
                <li key={m.id} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[13px] transition ${
                      selected
                        ? "bg-[var(--store-accent)]/10 font-medium text-[var(--store-brand)]"
                        : "text-stone-800 hover:bg-[#fff8fb]"
                    }`}
                    onClick={() => pick(m.id)}
                  >
                    <span>{municipalityDisplayLabel(m)}</span>
                    {selected ? (
                      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--store-accent)]">
                        Elegido
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
            <li role="option" aria-selected={isOtherCity} className="mt-1 border-t border-stone-100 pt-1">
              <button
                type="button"
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] transition ${
                  isOtherCity
                    ? "bg-amber-50 font-medium text-amber-950"
                    : "text-stone-600 hover:bg-stone-50"
                }`}
                onClick={() => pick(SHIPPING_CITY_OTHER)}
              >
                Mi municipio no aparece
              </button>
            </li>
          </ul>
        ) : null}
      </div>

      {selectedMunicipality && !isOtherCity ? (
        <p className="rounded-2xl border border-stone-200 bg-[#faf9f8] px-4 py-3 text-sm text-stone-700">
          Envío a{" "}
          <span className="font-medium text-stone-900">
            {municipalityDisplayLabel(selectedMunicipality)}
          </span>
          :{" "}
          <span className="font-semibold tabular-nums text-[var(--store-brand)]">
            {freeShippingQualified && selectedMunicipality.rate_cents > 0
              ? `Gratis (antes ${formatCop(selectedMunicipality.rate_cents)})`
              : formatShippingRateLabel(shippingCents)}
          </span>
        </p>
      ) : null}

      {isOtherCity ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">¿No encuentras tu municipio?</p>
          <p className="mt-1 leading-relaxed text-amber-900/90">
            Escríbenos por WhatsApp para cotizar el envío y completar tu pedido.
          </p>
          {waHref ? (
            <Link
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center justify-center border border-[var(--store-accent)] bg-[var(--store-accent)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--store-accent-hover)]"
            >
              Contactar por WhatsApp
            </Link>
          ) : (
            <p className="mt-2 text-xs text-amber-800">
              WhatsApp no está configurado. Escríbenos desde el botón flotante de la tienda.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Filas de envío + total (va dentro del `<dl>` del resumen). */
export function CheckoutShippingTotals() {
  const {
    shippingCents,
    freeShippingQualified,
    selectedMunicipality,
    isOtherCity,
    cityValue,
    totalWithShippingCents,
  } = useCheckoutShipping();

  return (
    <>
      <div className="flex justify-between gap-4">
        <dt className="text-stone-600">Envío</dt>
        <dd
          className={`shrink-0 text-xs font-medium uppercase tracking-wide ${
            freeShippingQualified && shippingCents === 0 && selectedMunicipality
              ? "font-semibold text-emerald-700"
              : selectedMunicipality
                ? "text-sm font-medium normal-case tracking-normal tabular-nums text-stone-800"
                : "text-stone-500"
          }`}
        >
          {!cityValue
            ? "Elige municipio"
            : isOtherCity
              ? "Por WhatsApp"
              : freeShippingQualified && selectedMunicipality
                ? "Gratis"
                : formatCop(shippingCents)}
        </dd>
      </div>
      <div className="flex justify-between gap-4 border-t border-stone-400 pt-4 text-[15px] font-semibold text-stone-900">
        <dt>Total a pagar</dt>
        <dd className="tabular-nums">{formatCop(totalWithShippingCents)}</dd>
      </div>
    </>
  );
}

export function CheckoutSubmitButton({ className }: { className: string }) {
  const { pending } = useFormStatus();
  const { cityValue, isOtherCity, selectedMunicipality } = useCheckoutShipping();
  const canSubmit =
    Boolean(cityValue) && !isOtherCity && selectedMunicipality != null;

  return (
    <>
      <button
        type="submit"
        className={`${className} disabled:cursor-not-allowed disabled:opacity-50`}
        disabled={!canSubmit || pending}
      >
        {pending ? "Procesando…" : "Finalizar compra"}
      </button>
      {!canSubmit && isOtherCity ? (
        <p className="text-center text-xs leading-relaxed text-stone-500">
          Para municipios no listados, completa el pedido por WhatsApp.
        </p>
      ) : null}
    </>
  );
}
