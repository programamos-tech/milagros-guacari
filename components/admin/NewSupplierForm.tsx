"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createSupplierAction } from "@/app/actions/admin/suppliers";
import {
  productInputClass as inputClass,
  productLabelClass as labelClass,
  productSectionTitle as sectionTitle,
} from "@/components/admin/product-form-primitives";

const cardClass =
  "rounded-xl border border-zinc-200 bg-white p-6 shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-none dark:ring-white/[0.06]";

export function NewSupplierHeader() {
  return (
    <div className="mb-6 flex min-w-0 flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <Link href="/admin/proveedores" className="hover:text-zinc-800 dark:hover:text-zinc-200">
            Proveedores
          </Link>
          <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">/</span>
          <span className="text-zinc-700 dark:text-zinc-300">Nuevo proveedor</span>
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl md:text-3xl">
          Nuevo proveedor
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
          Registra un proveedor para asignarle facturas de compra, saldos pendientes y abonos desde
          Facturas de proveedores.
        </p>
      </div>
      <Link
        href="/admin/proveedores"
        className="inline-flex size-10 shrink-0 items-center justify-center self-start rounded-lg border border-zinc-200/90 bg-white text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 sm:self-auto"
        aria-label="Volver al listado"
      >
        <span className="text-lg leading-none" aria-hidden>
          ←
        </span>
      </Link>
    </div>
  );
}

export function NewSupplierForm() {
  const [name, setName] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const canSubmit = name.trim().length > 0;

  const emailPreview = useMemo(() => {
    const t = email.trim();
    return t.length > 0 ? t : "—";
  }, [email]);

  return (
    <form action={createSupplierAction} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-6 lg:col-span-2">
          <section className={cardClass}>
            <h2 className={sectionTitle}>Datos del proveedor</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="ns-name" className={labelClass}>
                  Nombre o razón social <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <input
                  id="ns-name"
                  name="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Distribuidora American"
                  autoComplete="organization"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="ns-doc" className={labelClass}>
                  NIT / documento
                </label>
                <input
                  id="ns-doc"
                  name="document_id"
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  placeholder="Ej. 900123456-7"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="ns-phone" className={labelClass}>
                  Teléfono
                </label>
                <input
                  id="ns-phone"
                  name="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej. 601 000 0000"
                  inputMode="tel"
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="ns-email" className={labelClass}>
                  Correo electrónico
                </label>
                <input
                  id="ns-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ej. pagos@proveedor.com"
                  autoComplete="email"
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="ns-notes" className={labelClass}>
                  Notas internas
                </label>
                <textarea
                  id="ns-notes"
                  name="notes"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Condiciones de pago, contacto de cobranzas, etc."
                  className={inputClass}
                />
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6 lg:sticky lg:top-24 lg:col-span-1 lg:self-start">
          <section className={cardClass}>
            <h2 className={sectionTitle}>Resumen</h2>
            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-950/60">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">
                Proveedor
              </p>
              <dl className="mt-3 space-y-2 text-zinc-700 dark:text-zinc-300">
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500 dark:text-zinc-400">Nombre</dt>
                  <dd className="max-w-[58%] truncate text-right font-medium text-zinc-900 dark:text-zinc-100">
                    {name.trim() || "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 border-t border-zinc-200/80 pt-2 dark:border-zinc-700/80">
                  <dt className="text-zinc-500 dark:text-zinc-400">Documento</dt>
                  <dd className="max-w-[58%] truncate text-right font-medium text-zinc-900 dark:text-zinc-100">
                    {documentId.trim() || "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 border-t border-zinc-200/80 pt-2 dark:border-zinc-700/80">
                  <dt className="text-zinc-500 dark:text-zinc-400">Correo</dt>
                  <dd className="max-w-[58%] truncate text-right font-medium text-zinc-900 dark:text-zinc-100">
                    {emailPreview}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                El nombre es obligatorio. El resto es opcional y podés completarlo después.
              </p>
            </div>

            <p className="mt-5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Después podés registrar facturas de compra y abonos desde la ficha del proveedor.
            </p>

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-5 w-full rounded-lg border border-rose-950 bg-rose-950 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-900 hover:border-rose-900 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-200 disabled:text-zinc-500 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
            >
              Crear proveedor
            </button>
          </section>
        </div>
      </div>
    </form>
  );
}
