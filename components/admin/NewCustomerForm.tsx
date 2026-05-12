"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createStoreCustomer } from "@/app/actions/admin/store-customers";
import {
  productInputClass as inputClass,
  productLabelClass as labelClass,
  productSectionTitle as sectionTitle,
} from "@/components/admin/product-form-primitives";

const shellCard =
  "rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-none dark:ring-white/[0.06]";

type Addr = {
  key: string;
  label: string;
  addressLine: string;
  reference: string;
};

const LABEL_OPTIONS = ["Casa", "Oficina", "Negocio", "Otro"] as const;

function newAddress(): Addr {
  return {
    key: crypto.randomUUID(),
    label: "Casa",
    addressLine: "",
    reference: "",
  };
}

export function NewCustomerHeader() {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <Link
            href="/admin/customers"
            className="hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            Clientes
          </Link>
          <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">/</span>
          <span className="text-zinc-700 dark:text-zinc-300">Nuevo cliente</span>
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
          Nuevo cliente
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
          Registra un nuevo cliente. Puedes añadir varias direcciones (casa, oficina, etc.).
        </p>
      </div>
      <Link
        href="/admin/customers"
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:shadow-none dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        aria-label="Volver al listado"
      >
        <span className="text-lg leading-none" aria-hidden>
          ←
        </span>
      </Link>
    </div>
  );
}

export function NewCustomerForm() {
  const [name, setName] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [addresses, setAddresses] = useState<Addr[]>(() => [newAddress()]);

  const payload = useMemo(
    () =>
      JSON.stringify(
        addresses.map((a) => ({
          label: a.label,
          address_line: a.addressLine,
          reference: a.reference,
        })),
      ),
    [addresses],
  );

  const filledCount = useMemo(
    () =>
      addresses.filter((a) => a.addressLine.trim().length > 0 || a.reference.trim().length > 0)
        .length,
    [addresses],
  );

  const summaryAddresses =
    filledCount === 0
      ? "ninguna"
      : filledCount === 1
        ? "1 dirección"
        : `${filledCount} direcciones`;

  const canSubmit = name.trim().length > 0;

  function updateAddr(i: number, patch: Partial<Addr>) {
    setAddresses((prev) =>
      prev.map((a, j) => (j === i ? { ...a, ...patch } : a)),
    );
  }

  function addAddress() {
    setAddresses((prev) => [...prev, newAddress()]);
  }

  function removeAddress(i: number) {
    setAddresses((prev) => (prev.length <= 1 ? prev : prev.filter((_, j) => j !== i)));
  }

  return (
    <form action={createStoreCustomer} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-6 lg:col-span-2">
          <section className={`${shellCard} p-6 sm:p-8`}>
            <h2 className={sectionTitle}>Datos personales</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="nc-name" className={labelClass}>
                  Nombre completo <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <input
                  id="nc-name"
                  name="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. María López"
                  autoComplete="name"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="nc-doc" className={labelClass}>
                  Cédula
                </label>
                <input
                  id="nc-doc"
                  name="document_id"
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  placeholder="Ej. 1234567890"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="nc-phone" className={labelClass}>
                  Teléfono
                </label>
                <input
                  id="nc-phone"
                  name="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej. 312 000 0000"
                  inputMode="tel"
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="nc-email" className={labelClass}>
                  Correo electrónico
                </label>
                <input
                  id="nc-email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="Ej. maria@ejemplo.com"
                  autoComplete="email"
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <section className={`${shellCard} p-6 sm:p-8`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <h2 className={sectionTitle}>Direcciones</h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Casa, oficina, casa de los abuelos… Añadí las que necesites. Dirección
                  completa y punto de referencia para que el repartidor ubique fácil.
                </p>
              </div>
              <button
                type="button"
                onClick={addAddress}
                className="inline-flex shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:shadow-none dark:hover:bg-zinc-700"
              >
                + Añadir dirección
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {addresses.map((a, i) => (
                <div
                  key={a.key}
                  className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 sm:p-5 dark:border-zinc-700 dark:bg-zinc-950/50"
                >
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">
                      Dirección {i + 1}
                    </p>
                    {addresses.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeAddress(i)}
                        className="text-xs font-semibold text-red-600 hover:underline dark:text-red-400"
                      >
                        Quitar
                      </button>
                    ) : null}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Tipo</label>
                      <select
                        value={a.label}
                        onChange={(e) => updateAddr(i, { label: e.target.value })}
                        className={inputClass}
                      >
                        {LABEL_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Dirección completa</label>
                      <textarea
                        value={a.addressLine}
                        onChange={(e) => updateAddr(i, { addressLine: e.target.value })}
                        rows={3}
                        placeholder="Ej. Cra 10 # 20-30, Apto 502, barrio Centro. Portería azul."
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Punto de referencia</label>
                      <textarea
                        value={a.reference}
                        onChange={(e) => updateAddr(i, { reference: e.target.value })}
                        rows={2}
                        placeholder="Ej. Frente al parque, casa blanca portón negro."
                        className={inputClass}
                      />
                      <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                        Para que el domiciliario encuentre el lugar (esquina, color de la casa,
                        negocio cercano, etc.).
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <input type="hidden" name="addresses_payload" value={payload} readOnly />
        </div>

        <div className="space-y-6 lg:sticky lg:top-24 lg:col-span-1 lg:self-start">
          <section className={`${shellCard} p-6 sm:p-8`}>
            <h2 className={sectionTitle}>Resumen</h2>
            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-950/50">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">
                Cliente
              </p>
              <dl className="mt-3 space-y-2 text-zinc-700 dark:text-zinc-300">
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500 dark:text-zinc-400">Nombre</dt>
                  <dd className="max-w-[58%] truncate text-right font-medium text-zinc-900 dark:text-zinc-100">
                    {name.trim() || "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 border-t border-zinc-200/80 pt-2 dark:border-zinc-700">
                  <dt className="text-zinc-500 dark:text-zinc-400">Direcciones</dt>
                  <dd className="text-right font-medium text-zinc-900 dark:text-zinc-100">
                    {summaryAddresses}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                Completa al menos el nombre. Las direcciones son opcionales.
              </p>
            </div>

            <p className="mt-5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              En cada pedido con envío podrás elegir a qué dirección enviar.
            </p>

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-5 w-full rounded-lg border border-rose-950 bg-rose-950 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-900 hover:border-rose-900 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-200 disabled:text-zinc-500 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
            >
              Crear cliente
            </button>
          </section>
        </div>
      </div>
    </form>
  );
}
