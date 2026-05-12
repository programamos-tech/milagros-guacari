"use client";

import Link from "next/link";
import { useState } from "react";
import {
  createStoreCoupon,
  deleteStoreCoupon,
  updateStoreCoupon,
} from "@/app/actions/admin/store-coupons";
import { useAdminTheme } from "@/components/admin/AdminThemeProvider";
import {
  CouponProductPicker,
  type CouponProductPickerHit,
} from "@/components/admin/CouponProductPicker";
import {
  AdminDateInput,
  productInputClass as inputClass,
  productLabelClass as labelClass,
  productSectionTitle as sectionTitle,
} from "@/components/admin/product-form-primitives";
import type { StoreCouponRow } from "@/lib/store-coupons";
import { storeCouponToDateInputValue } from "@/lib/store-coupons";

/** Alineado con `data-admin-theme` (evita tarjeta blanca si `dark:` no aplica al contenedor). */
function couponFormCardShell(resolved: "light" | "dark"): string {
  return resolved === "dark"
    ? "rounded-2xl border border-zinc-700/90 bg-zinc-900 p-4 shadow-none ring-1 ring-white/[0.06] sm:p-6"
    : "rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm ring-1 ring-zinc-950/5 sm:p-6";
}

export function NewCouponHeader() {
  return (
    <div className="mb-6 flex min-w-0 flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <Link href="/admin/coupons" className="hover:text-zinc-800 dark:hover:text-zinc-200">
            Cupones
          </Link>
          <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">/</span>
          <span className="text-zinc-700 dark:text-zinc-300">Nuevo cupón</span>
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl md:text-3xl">
          Nuevo cupón
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
          Define el mensaje de la franja superior, el código y el descuento que se aplicará en el
          checkout.
        </p>
      </div>
      <Link
        href="/admin/coupons"
        className="inline-flex size-10 shrink-0 items-center justify-center self-start rounded-lg border border-zinc-200/90 bg-white text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:shadow-none dark:hover:bg-zinc-800 dark:hover:text-zinc-100 sm:self-auto"
        aria-label="Volver al listado"
      >
        <span className="text-lg leading-none" aria-hidden>
          ←
        </span>
      </Link>
    </div>
  );
}

export function NewCouponForm() {
  const adminTheme = useAdminTheme();
  const cardShell = couponFormCardShell(adminTheme?.resolved ?? "light");

  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  return (
    <form action={createStoreCoupon} className="space-y-6">
      <section className={cardShell}>
        <h2 className={sectionTitle}>Datos del cupón</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="nc-internal" className={labelClass}>
              Nombre interno{" "}
              <span className="font-normal text-zinc-500 dark:text-zinc-400">(opcional)</span>
            </label>
            <input
              id="nc-internal"
              name="internal_label"
              placeholder="Bienvenida, Día de las madres…"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="nc-sort" className={labelClass}>
              Orden en franja{" "}
              <span className="font-normal text-zinc-500 dark:text-zinc-400">(0 = primero)</span>
            </label>
            <input
              id="nc-sort"
              name="sort_order"
              type="number"
              min={0}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="nc-banner" className={labelClass}>
              Texto del banner <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="nc-banner"
              name="banner_message"
              required
              placeholder="Bienvenida: 10% OFF en tu primera compra"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="nc-code" className={labelClass}>
              Código <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="nc-code"
              name="code"
              required
              placeholder="BIENVENIDA10"
              className={`${inputClass} font-mono`}
            />
          </div>
          <div>
            <label htmlFor="nc-pct" className={labelClass}>
              Descuento (%)
            </label>
            <input
              id="nc-pct"
              name="discount_percent"
              type="number"
              min={0}
              max={100}
              defaultValue={10}
              className={inputClass}
            />
          </div>
          <CouponProductPicker
            initialSelected={[]}
            restrictInitially={false}
          />
          <div>
            <label htmlFor="nc-start" className={labelClass}>
              Inicio{" "}
              <span className="font-normal text-zinc-500 dark:text-zinc-400">(día, opcional)</span>
            </label>
            <AdminDateInput
              id="nc-start"
              name="starts_at"
              value={startsAt}
              onChange={setStartsAt}
              allowEmpty
            />
          </div>
          <div>
            <label htmlFor="nc-end" className={labelClass}>
              Fin{" "}
              <span className="font-normal text-zinc-500 dark:text-zinc-400">(día, opcional)</span>
            </label>
            <AdminDateInput
              id="nc-end"
              name="ends_at"
              value={endsAt}
              onChange={setEndsAt}
              allowEmpty
            />
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200 sm:col-span-2">
            <input
              type="checkbox"
              name="is_enabled"
              defaultChecked
              className="size-4 rounded border-zinc-300 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900"
            />
            Cupón habilitado
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200 sm:col-span-2">
            <input
              type="checkbox"
              name="show_in_banner"
              defaultChecked
              className="size-4 rounded border-zinc-300 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900"
            />
            Mostrar en franja superior de la tienda
          </label>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg border border-rose-950 bg-rose-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-900 hover:border-rose-900 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            Crear cupón
          </button>
          <Link
            href="/admin/coupons"
            className="inline-flex items-center justify-center rounded-lg border border-rose-200/70 bg-white px-4 py-2.5 text-sm font-medium text-rose-950 transition hover:border-rose-300/80 hover:bg-rose-50/50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Cancelar
          </Link>
        </div>
      </section>
    </form>
  );
}

export function EditCouponHeader({ row }: { row: StoreCouponRow }) {
  const title = row.internal_label?.trim() || row.code;
  return (
    <div className="mb-6 flex min-w-0 flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <Link href="/admin/coupons" className="hover:text-zinc-800 dark:hover:text-zinc-200">
            Cupones
          </Link>
          <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">/</span>
          <span className="text-zinc-700 dark:text-zinc-300">Editar</span>
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl md:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
          Actualiza el mensaje, el código, las fechas o desactiva el cupón cuando termine la campaña.
        </p>
      </div>
      <Link
        href="/admin/coupons"
        className="inline-flex size-10 shrink-0 items-center justify-center self-start rounded-lg border border-zinc-200/90 bg-white text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:shadow-none dark:hover:bg-zinc-800 dark:hover:text-zinc-100 sm:self-auto"
        aria-label="Volver al listado"
      >
        <span className="text-lg leading-none" aria-hidden>
          ←
        </span>
      </Link>
    </div>
  );
}

export function EditCouponForm({
  row,
  linkedProducts,
}: {
  row: StoreCouponRow;
  linkedProducts: CouponProductPickerHit[];
}) {
  const adminTheme = useAdminTheme();
  const cardShell = couponFormCardShell(adminTheme?.resolved ?? "light");

  const [startsAt, setStartsAt] = useState(() =>
    storeCouponToDateInputValue(row.starts_at),
  );
  const [endsAt, setEndsAt] = useState(() =>
    storeCouponToDateInputValue(row.ends_at),
  );

  return (
    <form action={updateStoreCoupon} className="space-y-6">
      <input type="hidden" name="id" value={row.id} />
      <section className={cardShell}>
        <h2 className={sectionTitle}>Datos del cupón</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ec-internal" className={labelClass}>
              Nombre interno{" "}
              <span className="font-normal text-zinc-500 dark:text-zinc-400">(opcional)</span>
            </label>
            <input
              id="ec-internal"
              name="internal_label"
              defaultValue={row.internal_label ?? ""}
              placeholder="Bienvenida, Día de las madres…"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="ec-sort" className={labelClass}>
              Orden en franja
            </label>
            <input
              id="ec-sort"
              name="sort_order"
              type="number"
              min={0}
              defaultValue={row.sort_order}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ec-banner" className={labelClass}>
              Texto del banner <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="ec-banner"
              name="banner_message"
              required
              defaultValue={row.banner_message}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="ec-code" className={labelClass}>
              Código <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="ec-code"
              name="code"
              required
              defaultValue={row.code}
              className={`${inputClass} font-mono`}
            />
          </div>
          <div>
            <label htmlFor="ec-pct" className={labelClass}>
              Descuento (%)
            </label>
            <input
              id="ec-pct"
              name="discount_percent"
              type="number"
              min={0}
              max={100}
              defaultValue={row.discount_percent}
              className={inputClass}
            />
          </div>
          <CouponProductPicker
            key={row.id}
            initialSelected={linkedProducts}
            restrictInitially={linkedProducts.length > 0}
          />
          <div>
            <label htmlFor="ec-start" className={labelClass}>
              Inicio{" "}
              <span className="font-normal text-zinc-500 dark:text-zinc-400">(día, opcional)</span>
            </label>
            <AdminDateInput
              id="ec-start"
              name="starts_at"
              value={startsAt}
              onChange={setStartsAt}
              allowEmpty
            />
          </div>
          <div>
            <label htmlFor="ec-end" className={labelClass}>
              Fin{" "}
              <span className="font-normal text-zinc-500 dark:text-zinc-400">(día, opcional)</span>
            </label>
            <AdminDateInput
              id="ec-end"
              name="ends_at"
              value={endsAt}
              onChange={setEndsAt}
              allowEmpty
            />
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200 sm:col-span-2">
            <input
              type="checkbox"
              name="is_enabled"
              defaultChecked={row.is_enabled}
              className="size-4 rounded border-zinc-300 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900"
            />
            Cupón habilitado
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200 sm:col-span-2">
            <input
              type="checkbox"
              name="show_in_banner"
              defaultChecked={row.show_in_banner}
              className="size-4 rounded border-zinc-300 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900"
            />
            Mostrar en franja superior de la tienda
          </label>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg border border-rose-950 bg-rose-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-900 hover:border-rose-900 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            Guardar cambios
          </button>
          <Link
            href="/admin/coupons"
            className="inline-flex items-center justify-center rounded-lg border border-rose-200/70 bg-white px-4 py-2.5 text-sm font-medium text-rose-950 transition hover:border-rose-300/80 hover:bg-rose-50/50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Volver al listado
          </Link>
          <button
            type="submit"
            formAction={deleteStoreCoupon}
            className="ml-auto inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-800/55 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/25"
          >
            Eliminar cupón
          </button>
        </div>
      </section>
    </form>
  );
}
