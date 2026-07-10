"use client";

import Link from "next/link";
import { useCheckoutShipping } from "@/components/store/CheckoutShippingProvider";
import { formatCop } from "@/lib/money";
import {
  formatShippingRateLabel,
  municipalityDisplayLabel,
  SHIPPING_CITY_OTHER,
} from "@/lib/store-shipping";
import { storeWhatsAppUrl } from "@/lib/brand";

export function CheckoutCitySelect({
  labelClass,
  inputClass,
  selectClass,
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

  const waHref =
    storeWhatsAppUrl === "#"
      ? null
      : `${storeWhatsAppUrl}?text=${encodeURIComponent(
          "Hola, quiero hacer un pedido pero mi municipio no aparece en las opciones de envío de la tienda.",
        )}`;

  return (
    <div className="space-y-3">
      <label className="block">
        <span className={labelClass}>Municipio / ciudad de envío</span>
        <select
          name="shipping_municipality_id"
          required={required}
          value={cityValue}
          onChange={(e) => setCityValue(e.target.value)}
          className={selectClass ?? inputClass}
        >
          <option value="">Selecciona tu municipio…</option>
          {municipalities.map((m) => (
            <option key={m.id} value={m.id}>
              {municipalityDisplayLabel(m)} — {formatShippingRateLabel(m.rate_cents)}
            </option>
          ))}
          <option value={SHIPPING_CITY_OTHER}>Mi municipio no aparece</option>
        </select>
      </label>

      {/* Ciudad legible para el pedido / perfil */}
      <input
        type="hidden"
        name="city"
        value={isOtherCity ? "" : (selectedMunicipality?.name ?? "")}
        readOnly
      />

      {selectedMunicipality && !isOtherCity ? (
        <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
          Envío a <strong>{municipalityDisplayLabel(selectedMunicipality)}</strong>:{" "}
          <strong className="tabular-nums">
            {freeShippingQualified && selectedMunicipality.rate_cents > 0
              ? `Gratis (antes ${formatCop(selectedMunicipality.rate_cents)})`
              : formatShippingRateLabel(shippingCents)}
          </strong>
        </p>
      ) : null}

      {isOtherCity ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
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
  const { cityValue, isOtherCity, selectedMunicipality } = useCheckoutShipping();
  const canSubmit =
    Boolean(cityValue) && !isOtherCity && selectedMunicipality != null;

  return (
    <>
      <button
        type="submit"
        className={`${className} disabled:cursor-not-allowed disabled:opacity-50`}
        disabled={!canSubmit}
      >
        Finalizar compra
      </button>
      {!canSubmit && isOtherCity ? (
        <p className="text-center text-xs leading-relaxed text-stone-500">
          Para municipios no listados, completa el pedido por WhatsApp.
        </p>
      ) : null}
    </>
  );
}
