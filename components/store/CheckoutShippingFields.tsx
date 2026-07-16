"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckoutCitySelect } from "@/components/store/CheckoutCitySelect";
import {
  readCheckoutFormDraft,
  writeCheckoutFormDraft,
} from "@/lib/checkout-form-draft";

export type CheckoutSavedAddress = {
  id: string;
  label: string;
  address_line: string;
  reference: string;
};

export type CheckoutShippingInitial = {
  firstName: string;
  lastName: string;
  /** Dirección principal a prellenar (perfil o último pedido). */
  profileAddressLine: string;
  city: string;
  neighborhood: string;
  reference: string;
  mobile: string;
  /** Id de municipio tarifado del último pedido, si existe. */
  municipalityId?: string;
};

type Props = {
  initial: CheckoutShippingInitial;
  savedAddresses: CheckoutSavedAddress[];
  accountEmail: string | null;
  labelClass: string;
  inputClass: string;
  /** Si no se pasa, el select usa `inputClass`. */
  selectClass?: string;
};

/**
 * Campos de envío con selector de direcciones guardadas (cuenta tienda).
 * Persiste en sessionStorage para sobrevivir refresh y cambios de bolsa.
 */
export function CheckoutShippingFields({
  initial,
  savedAddresses,
  accountEmail,
  labelClass,
  inputClass,
  selectClass,
}: Props) {
  const profileLine = initial.profileAddressLine.trim();

  const options = useMemo(() => {
    const list: { value: string; label: string }[] = [
      {
        value: "profile",
        label: profileLine
          ? `Última · ${profileLine.slice(0, 48)}${profileLine.length > 48 ? "…" : ""}`
          : "Última dirección / perfil",
      },
    ];
    for (const a of savedAddresses) {
      list.push({
        value: `addr:${a.id}`,
        label: `${a.label}: ${a.address_line}`,
      });
    }
    list.push({
      value: "manual",
      label: "Otra dirección (editar abajo)",
    });
    return list;
  }, [savedAddresses, profileLine]);

  const defaultSelection = useMemo(() => {
    if (profileLine) return "profile";
    if (savedAddresses.length > 0) return `addr:${savedAddresses[0].id}`;
    return "profile";
  }, [savedAddresses, profileLine]);

  const [selection, setSelection] = useState(defaultSelection);
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [address, setAddress] = useState(
    () => profileLine || savedAddresses[0]?.address_line.trim() || "",
  );
  const [neighborhood, setNeighborhood] = useState(initial.neighborhood);
  const [reference, setReference] = useState(initial.reference);
  const [mobile, setMobile] = useState(initial.mobile);
  const [email, setEmail] = useState(accountEmail ?? "");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const draft = readCheckoutFormDraft();
    if (draft) {
      if (draft.firstName) setFirstName(draft.firstName);
      if (draft.lastName) setLastName(draft.lastName);
      if (draft.address) setAddress(draft.address);
      if (draft.neighborhood) setNeighborhood(draft.neighborhood);
      if (draft.reference) setReference(draft.reference);
      if (draft.mobile) setMobile(draft.mobile);
      if (!accountEmail && draft.email) setEmail(draft.email);
      if (draft.addressSelection) setSelection(draft.addressSelection);
    }
    setHydrated(true);
  }, [accountEmail]);

  useEffect(() => {
    if (!hydrated) return;
    writeCheckoutFormDraft({
      firstName,
      lastName,
      address,
      neighborhood,
      reference,
      mobile,
      email: accountEmail ?? email,
      addressSelection: selection,
    });
  }, [
    hydrated,
    firstName,
    lastName,
    address,
    neighborhood,
    reference,
    mobile,
    email,
    selection,
    accountEmail,
  ]);

  function applySelection(next: string) {
    setSelection(next);
    if (next === "profile") {
      setAddress(profileLine);
      setNeighborhood(initial.neighborhood);
      setReference(initial.reference);
      setMobile(initial.mobile);
      setFirstName(initial.firstName);
      setLastName(initial.lastName);
      return;
    }
    if (next === "manual") {
      return;
    }
    if (next.startsWith("addr:")) {
      const id = next.slice(5);
      const row = savedAddresses.find((a) => a.id === id);
      if (row) {
        setAddress(row.address_line.trim());
        setReference(row.reference?.trim() || initial.reference);
      }
      setNeighborhood(initial.neighborhood);
      setMobile(initial.mobile);
      setFirstName(initial.firstName);
      setLastName(initial.lastName);
    }
  }

  const showPicker =
    accountEmail != null && (savedAddresses.length > 0 || profileLine.length > 0);

  return (
    <div className="mt-6 space-y-5">
      {showPicker ? (
        <div>
          <label className={labelClass} htmlFor="checkout-saved-address">
            Tus direcciones
          </label>
          <select
            id="checkout-saved-address"
            value={selection}
            onChange={(e) => applySelection(e.target.value)}
            className={selectClass ?? inputClass}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-stone-500">
            Traemos tu última dirección. Puedes cambiarla o elegir otra guardada antes de
            pagar.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-1">
          <span className={labelClass}>Nombre</span>
          <input
            name="firstName"
            required
            autoComplete="given-name"
            placeholder="Escribe aquí…"
            className={inputClass}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </label>
        <label className="block sm:col-span-1">
          <span className={labelClass}>Apellido</span>
          <input
            name="lastName"
            required
            autoComplete="family-name"
            placeholder="Escribe aquí…"
            className={inputClass}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelClass}>Dirección</span>
          <input
            name="address"
            required
            autoComplete="street-address"
            placeholder="Calle, número, apto…"
            className={inputClass}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </label>
        <label className="block sm:col-span-1">
          <span className={labelClass}>Barrio</span>
          <input
            name="neighborhood"
            required
            autoComplete="address-level3"
            placeholder="Ej. Centro, La Castellana…"
            className={inputClass}
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
          />
        </label>
        <label className="block sm:col-span-1">
          <span className={labelClass}>Punto de referencia</span>
          <input
            name="reference"
            autoComplete="off"
            placeholder="Ej. frente al parque, casa blanca…"
            className={inputClass}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </label>
        <div className="sm:col-span-2">
          <CheckoutCitySelect
            labelClass={labelClass}
            inputClass={inputClass}
            selectClass={selectClass}
          />
        </div>
        <label className="block sm:col-span-1">
          <span className={labelClass}>Teléfono / WhatsApp</span>
          <input
            name="mobile"
            type="tel"
            required
            autoComplete="tel"
            placeholder="Escribe aquí…"
            className={inputClass}
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
          />
        </label>
        <label className="block sm:col-span-1">
          <span className={labelClass}>Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="correo@ejemplo.com"
            className={inputClass}
            value={email}
            onChange={(e) => {
              if (accountEmail) return;
              setEmail(e.target.value);
            }}
            readOnly={!!accountEmail}
            title={
              accountEmail
                ? "El email de tu sesión se usa en el pedido"
                : undefined
            }
          />
        </label>
        {accountEmail ? (
          <p className="sm:col-span-2 text-xs text-stone-500">
            Estás comprando con tu cuenta: el email no se puede cambiar en este
            paso.
          </p>
        ) : null}
      </div>
    </div>
  );
}
