"use client";

import { useMemo, useState } from "react";

export type CheckoutSavedAddress = {
  id: string;
  label: string;
  address_line: string;
  reference: string;
};

export type CheckoutShippingInitial = {
  firstName: string;
  lastName: string;
  /** `customers.shipping_address` (perfil), independiente de direcciones guardadas */
  profileAddressLine: string;
  city: string;
  zipCode: string;
  mobile: string;
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
          ? `Perfil · ${profileLine.slice(0, 48)}${profileLine.length > 48 ? "…" : ""}`
          : "Perfil · dirección principal",
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
    if (savedAddresses.length > 0) {
      return `addr:${savedAddresses[0].id}`;
    }
    return "profile";
  }, [savedAddresses]);

  const [selection, setSelection] = useState(defaultSelection);
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [address, setAddress] = useState(
    savedAddresses[0]?.address_line.trim() || profileLine || "",
  );
  const [city, setCity] = useState(initial.city);
  const [zipCode, setZipCode] = useState(initial.zipCode);
  const [mobile, setMobile] = useState(initial.mobile);

  function applySelection(next: string) {
    setSelection(next);
    if (next === "profile") {
      setAddress(profileLine);
      setCity(initial.city);
      setZipCode(initial.zipCode);
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
      }
      setCity(initial.city);
      setZipCode(initial.zipCode);
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
            Elige una dirección guardada o la del perfil. Ciudad, código postal y
            teléfono vienen de tu cuenta; puedes ajustarlos antes de pagar.
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
          <span className={labelClass}>Ciudad</span>
          <input
            name="city"
            required
            autoComplete="address-level2"
            placeholder="Escribe aquí…"
            className={inputClass}
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </label>
        <label className="block sm:col-span-1">
          <span className={labelClass}>Código postal</span>
          <input
            name="zipCode"
            autoComplete="postal-code"
            placeholder="Opcional"
            className={inputClass}
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
          />
        </label>
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
            defaultValue={accountEmail ?? ""}
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
