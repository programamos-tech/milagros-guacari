"use client";

import Link from "next/link";
import { useState } from "react";
import {
  createStoreShippingMunicipality,
  deleteStoreShippingMunicipality,
  updateStoreShippingMunicipality,
} from "@/app/actions/admin/store-shipping";
import { AdminFormSubmitButton } from "@/components/admin/AdminFormSubmitButton";
import {
  ProductMoneyInput,
  productInputClass as inputClass,
  productLabelClass as labelClass,
  productSectionTitle as sectionTitle,
} from "@/components/admin/product-form-primitives";
import type { StoreShippingMunicipalityRow } from "@/lib/store-shipping";
import { formatCop } from "@/lib/money";
import { municipalityDisplayLabel } from "@/lib/store-shipping";

const cardClass =
  "rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm ring-1 ring-zinc-950/5 sm:p-6 dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-none dark:ring-white/[0.06]";

function yesNoBadge(active: boolean) {
  return active
    ? "bg-emerald-50 text-emerald-900 ring-emerald-200/90 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-800/60"
    : "bg-zinc-100 text-zinc-600 ring-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600";
}

export function NewShippingMunicipalityHeader() {
  return (
    <div className="mb-8">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        <Link href="/admin/envios" className="hover:text-zinc-800 dark:hover:text-zinc-200">
          Envíos
        </Link>
        <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">/</span>
        <span className="text-zinc-700 dark:text-zinc-300">Nuevo</span>
      </p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl">
        Nuevo municipio de envío
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        Define el precio de envío para un municipio. En el checkout el cliente lo elige y ve el
        costo al instante.
      </p>
    </div>
  );
}

export function EditShippingMunicipalityHeader({ name }: { name: string }) {
  return (
    <div className="mb-8">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        <Link href="/admin/envios" className="hover:text-zinc-800 dark:hover:text-zinc-200">
          Envíos
        </Link>
        <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">/</span>
        <span className="text-zinc-700 dark:text-zinc-300">Editar</span>
      </p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl">
        {name}
      </h1>
    </div>
  );
}

function ShippingMunicipalityFields({
  initial,
}: {
  initial?: StoreShippingMunicipalityRow;
}) {
  const [rateCents, setRateCents] = useState(initial?.rate_cents ?? 0);

  return (
    <div className={`${cardClass} space-y-5`}>
      <h2 className={sectionTitle}>Datos del municipio</h2>
      <label className="block">
        <span className={labelClass}>Municipio / ciudad</span>
        <input
          name="name"
          required
          defaultValue={initial?.name ?? ""}
          placeholder="Ej. Guacarí"
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className={labelClass}>Departamento (opcional)</span>
        <input
          name="department"
          defaultValue={initial?.department ?? ""}
          placeholder="Ej. Valle del Cauca"
          className={inputClass}
        />
      </label>
      <div>
        <span className={labelClass}>Precio de envío</span>
        <div className="mt-1.5">
          <ProductMoneyInput
            name="rate_cents"
            value={rateCents}
            onChange={setRateCents}
            required
          />
        </div>
      </div>
      <label className="block max-w-[10rem]">
        <span className={labelClass}>Orden</span>
        <input
          name="sort_order"
          type="number"
          min={0}
          step={1}
          defaultValue={initial?.sort_order ?? 0}
          className={inputClass}
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          name="is_enabled"
          defaultChecked={initial?.is_enabled ?? true}
          className="size-4 rounded border-zinc-300 text-rose-950 focus:ring-rose-900/30 dark:border-zinc-600 dark:bg-zinc-950"
        />
        Visible en el checkout
      </label>
    </div>
  );
}

export function NewShippingMunicipalityForm() {
  return (
    <form action={createStoreShippingMunicipality} className="space-y-6">
      <ShippingMunicipalityFields />
      <div className="flex flex-wrap gap-3">
        <AdminFormSubmitButton>Guardar municipio</AdminFormSubmitButton>
        <Link
          href="/admin/envios"
          className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

export function EditShippingMunicipalityForm({
  row,
}: {
  row: StoreShippingMunicipalityRow;
}) {
  return (
    <div className="space-y-6">
      <form action={updateStoreShippingMunicipality} className="space-y-6">
        <input type="hidden" name="id" value={row.id} />
        <ShippingMunicipalityFields initial={row} />
        <div className="flex flex-wrap gap-3">
          <AdminFormSubmitButton>Guardar cambios</AdminFormSubmitButton>
          <Link
            href="/admin/envios"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Volver
          </Link>
        </div>
      </form>
      <form action={deleteStoreShippingMunicipality}>
        <input type="hidden" name="id" value={row.id} />
        <button
          type="submit"
          className="text-sm font-semibold text-red-700 underline decoration-red-200 hover:decoration-red-400 dark:text-red-300 dark:decoration-red-800"
          onClick={(e) => {
            if (!window.confirm(`¿Eliminar el municipio «${row.name}»?`)) {
              e.preventDefault();
            }
          }}
        >
          Eliminar municipio
        </button>
      </form>
    </div>
  );
}

export function StoreShippingMunicipalitiesTable({
  rows,
}: {
  rows: StoreShippingMunicipalityRow[];
}) {
  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-none dark:ring-white/[0.06]">
      <div className="border-b border-zinc-100 px-4 py-4 dark:border-zinc-800 sm:px-5">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
          Municipios con tarifa
        </h2>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400 sm:px-5">
          Todavía no hay municipios.{" "}
          <Link
            href="/admin/envios/nuevo"
            className="font-semibold text-zinc-900 underline decoration-zinc-300 dark:text-zinc-100 dark:decoration-zinc-600"
          >
            Crear el primero
          </Link>
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">
              <tr>
                <th className="px-4 py-3 sm:px-5">Municipio</th>
                <th className="px-4 py-3 sm:px-5">Departamento</th>
                <th className="px-4 py-3 text-right sm:px-5">Envío</th>
                <th className="px-4 py-3 text-right sm:px-5">Orden</th>
                <th className="px-4 py-3 sm:px-5">Activo</th>
                <th className="px-4 py-3 text-right sm:px-5"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rows.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100 sm:px-5">
                    {row.name}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 sm:px-5">
                    {row.department?.trim() || "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-800 dark:text-zinc-200 sm:px-5">
                    {formatCop(row.rate_cents)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-600 dark:text-zinc-300 sm:px-5">
                    {row.sort_order}
                  </td>
                  <td className="px-4 py-3 sm:px-5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${yesNoBadge(row.is_enabled)}`}
                    >
                      {row.is_enabled ? "Sí" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right sm:px-5">
                    <Link
                      href={`/admin/envios/${row.id}/edit`}
                      className="text-sm font-semibold text-zinc-900 underline decoration-zinc-300 hover:decoration-zinc-500 dark:text-zinc-100 dark:decoration-zinc-600"
                      title={municipalityDisplayLabel(row)}
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
