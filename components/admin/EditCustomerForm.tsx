"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { updateStoreCustomer } from "@/app/actions/admin/store-customers";
import { CustomerAvatar } from "@/components/admin/CustomerAvatar";
import {
  productInputClass as inputClass,
  productLabelClass as labelClass,
  productSectionTitle as sectionTitle,
} from "@/components/admin/product-form-primitives";

const shellCard =
  "rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-none dark:ring-white/[0.06]";

const LABEL_OPTIONS = ["Casa", "Oficina", "Negocio", "Otro"] as const;
type LabelOption = (typeof LABEL_OPTIONS)[number];

export type EditCustomerAddressRow = {
  label: string;
  address_line: string | null;
  reference: string | null;
};

export type EditCustomerFormProps = {
  customerId: string;
  initialName: string;
  initialEmail: string;
  initialPhone: string;
  initialDocumentId: string;
  addressRows: EditCustomerAddressRow[];
  shippingFallback: string | null;
};

type Addr = {
  key: string;
  labelType: LabelOption;
  labelCustom: string;
  addressLine: string;
  reference: string;
};

function parseLabel(dbLabel: string): { labelType: LabelOption; labelCustom: string } {
  const t = dbLabel.trim();
  if ((LABEL_OPTIONS as readonly string[]).includes(t)) {
    return { labelType: t as LabelOption, labelCustom: "" };
  }
  return { labelType: "Otro", labelCustom: t };
}

function newAddress(): Addr {
  return {
    key: crypto.randomUUID(),
    labelType: "Casa",
    labelCustom: "",
    addressLine: "",
    reference: "",
  };
}

function rowsToAddrs(rows: EditCustomerAddressRow[]): Addr[] {
  if (!rows.length) return [];
  return rows.map((r) => ({
    key: crypto.randomUUID(),
    ...parseLabel(r.label),
    addressLine: (r.address_line ?? "").trim(),
    reference: (r.reference ?? "").trim(),
  }));
}

function initialAddressesFromProps(
  addressRows: EditCustomerAddressRow[],
  shippingFallback: string | null,
): Addr[] {
  const fromDb = rowsToAddrs(addressRows);
  if (fromDb.length) return fromDb;
  const ship = shippingFallback?.trim();
  if (ship) {
    const parts = ship.split(/\n\n+/);
    return [
      {
        key: crypto.randomUUID(),
        labelType: "Casa" as const,
        labelCustom: "",
        addressLine: (parts[0] ?? "").trim(),
        reference: parts.slice(1).join("\n\n").trim(),
      },
    ];
  }
  return [newAddress()];
}

function persistedLabel(a: Addr): string {
  if (a.labelType === "Otro") {
    return a.labelCustom.trim() || "Otro";
  }
  return a.labelType;
}

export function EditCustomerHeader({
  customerId,
  customerName,
  avatarSeed,
}: {
  customerId: string;
  customerName: string;
  avatarSeed: string;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-1 items-center gap-5 sm:gap-6">
        <CustomerAvatar
          seed={avatarSeed}
          size={100}
          className="shadow-md ring-2 ring-zinc-200/90 dark:ring-zinc-600"
          label={`Avatar de ${customerName}`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <Link
              href="/admin/customers"
              className="hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              Clientes
            </Link>
            <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">/</span>
            <Link
              href={`/admin/customers/${customerId}`}
              className="hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              {customerName}
            </Link>
            <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">/</span>
            <span className="text-zinc-700 dark:text-zinc-300">Editar</span>
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            Editar cliente
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            Modifica los datos y direcciones del cliente.
          </p>
        </div>
      </div>
      <Link
        href={`/admin/customers/${customerId}`}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:shadow-none dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        aria-label="Volver al detalle"
      >
        <span className="text-lg leading-none" aria-hidden>
          ←
        </span>
      </Link>
    </div>
  );
}

export function EditCustomerForm(props: EditCustomerFormProps) {
  const {
    customerId,
    initialName,
    initialEmail,
    initialPhone,
    initialDocumentId,
    addressRows,
    shippingFallback,
  } = props;

  const [name, setName] = useState(initialName);
  const [documentId, setDocumentId] = useState(initialDocumentId);
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState(initialEmail);
  const [addresses, setAddresses] = useState<Addr[]>(() =>
    initialAddressesFromProps(addressRows, shippingFallback),
  );

  const payload = useMemo(
    () =>
      JSON.stringify(
        addresses.map((a) => ({
          label: persistedLabel(a),
          address_line: a.addressLine,
          reference: a.reference,
        })),
      ),
    [addresses],
  );

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
    <form action={updateStoreCustomer} className="space-y-6">
      <input type="hidden" name="customer_id" value={customerId} readOnly />

      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-6 lg:col-span-2">
          <section className={`${shellCard} p-6 sm:p-8`}>
            <h2 className={sectionTitle}>Datos personales</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ec-name" className={labelClass}>
                  Nombre completo <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <input
                  id="ec-name"
                  name="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="ec-doc" className={labelClass}>
                  Cédula
                </label>
                <input
                  id="ec-doc"
                  name="document_id"
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="ec-phone" className={labelClass}>
                  Teléfono
                </label>
                <input
                  id="ec-phone"
                  name="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="ec-email" className={labelClass}>
                  Correo electrónico
                </label>
                <input
                  id="ec-email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
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
                  Casa, oficina, etc. Dirección completa y punto de referencia.
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
                    <div
                      className={
                        a.labelType === "Otro"
                          ? "grid gap-4 sm:grid-cols-2"
                          : "grid gap-4 sm:max-w-md"
                      }
                    >
                      <div>
                        <label className={labelClass}>Tipo</label>
                        <select
                          value={a.labelType}
                          onChange={(e) => {
                            const v = e.target.value as LabelOption;
                            updateAddr(i, {
                              labelType: v,
                              labelCustom: v === "Otro" ? a.labelCustom : "",
                            });
                          }}
                          className={inputClass}
                        >
                          {LABEL_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                      {a.labelType === "Otro" ? (
                        <div>
                          <label className={labelClass}>Especificar</label>
                          <input
                            value={a.labelCustom}
                            onChange={(e) =>
                              updateAddr(i, { labelCustom: e.target.value })
                            }
                            placeholder="Ej. Principal"
                            className={inputClass}
                          />
                        </div>
                      ) : null}
                    </div>
                    <div>
                      <label className={labelClass}>Dirección completa</label>
                      <textarea
                        value={a.addressLine}
                        onChange={(e) =>
                          updateAddr(i, { addressLine: e.target.value })
                        }
                        rows={3}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Punto de referencia</label>
                      <textarea
                        value={a.reference}
                        onChange={(e) =>
                          updateAddr(i, { reference: e.target.value })
                        }
                        rows={2}
                        className={inputClass}
                      />
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
            <h2 className={sectionTitle}>Guardar</h2>
            <div className="mt-5 flex flex-col gap-3">
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-lg bg-zinc-900 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
              >
                Guardar cambios
              </button>
              <Link
                href={`/admin/customers/${customerId}`}
                className="flex w-full items-center justify-center rounded-lg border border-zinc-200 bg-white py-3.5 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:shadow-none dark:hover:bg-zinc-700"
              >
                Cancelar
              </Link>
            </div>
          </section>
        </div>
      </div>
    </form>
  );
}
