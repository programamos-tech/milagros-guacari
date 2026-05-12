"use client";

import Image from "next/image";
import {
  createStoreWelcomeModal,
  deleteStoreWelcomeModal,
  updateStoreWelcomeModal,
} from "@/app/actions/admin/store-welcome-modal";
import { useAdminTheme } from "@/components/admin/AdminThemeProvider";
import {
  productInputClass as inputClass,
  productLabelClass as labelClass,
} from "@/components/admin/product-form-primitives";
import type { StoreWelcomeModalRow } from "@/lib/store-welcome-modal";
import {
  shouldUnoptimizeStorageImageUrl,
  storagePublicObjectUrl,
} from "@/lib/storage-public-url";

function welcomePanelShell(resolved: "light" | "dark"): string {
  return resolved === "dark"
    ? "space-y-4 rounded-2xl border border-zinc-700/90 bg-zinc-900 p-6 shadow-none ring-1 ring-white/[0.06]"
    : "space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm ring-1 ring-zinc-950/5";
}

function welcomeCreateFormShell(resolved: "light" | "dark"): string {
  return resolved === "dark"
    ? "space-y-3 rounded-xl border border-dashed border-zinc-600 bg-zinc-950/40 p-4"
    : "space-y-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 p-4";
}

function welcomeRowShell(resolved: "light" | "dark"): string {
  return resolved === "dark"
    ? "rounded-xl border border-zinc-700 bg-zinc-950/50 p-4 sm:p-5"
    : "rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 sm:p-5";
}

function errorText(code: string | undefined): string | null {
  if (!code) return null;
  switch (code) {
    case "title":
      return "El título del modal es obligatorio.";
    case "id":
      return "No se encontró el modal para actualizar.";
    case "db":
      return "No se pudo guardar en base de datos. Revisa migraciones/permisos.";
    case "size":
      return "La imagen supera 5 MB.";
    case "type":
      return "Solo se permiten imágenes JPEG, PNG, WebP o GIF.";
    case "upload":
      return "No se pudo subir la imagen a Storage.";
    default:
      return "No se pudo guardar el modal de bienvenida.";
  }
}

function WelcomeModalRowEditor({
  row,
  resolved,
}: {
  row: StoreWelcomeModalRow;
  resolved: "light" | "dark";
}) {
  const img = storagePublicObjectUrl(row.image_path);
  return (
    <li className={welcomeRowShell(resolved)}>
      <form action={updateStoreWelcomeModal} className="space-y-3">
        <input type="hidden" name="id" value={row.id} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Imagen</label>
            <input
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className={`${inputClass} block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 dark:text-zinc-400 dark:file:bg-zinc-800 dark:file:text-zinc-100`}
            />
            {img ? (
              <div className="mt-2">
                <div className="relative aspect-[4/3] w-full max-w-xs overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                  <Image
                    src={img}
                    alt="Imagen actual del modal"
                    fill
                    className="object-cover"
                    sizes="320px"
                    unoptimized={shouldUnoptimizeStorageImageUrl(img)}
                  />
                </div>
                <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    name="remove_image"
                    className="size-4 rounded border-zinc-300 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900"
                  />
                  Quitar imagen actual
                </label>
              </div>
            ) : (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Sin imagen cargada.</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Título</label>
            <input
              name="title"
              required
              defaultValue={row.title}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Descripción</label>
            <textarea
              name="description"
              defaultValue={row.description}
              rows={3}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Código descuento</label>
            <input
              name="discount_code"
              defaultValue={row.discount_code ?? ""}
              placeholder="BIENVENIDA10"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Orden</label>
            <input
              name="sort_order"
              type="number"
              min={0}
              defaultValue={row.sort_order}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Texto del botón</label>
            <input
              name="cta_label"
              defaultValue={row.cta_label}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Enlace del botón</label>
            <input
              name="cta_href"
              type="url"
              defaultValue={row.cta_href ?? ""}
              placeholder="https://wa.me/..."
              className={inputClass}
            />
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200 sm:col-span-2">
            <input
              type="checkbox"
              name="is_enabled"
              defaultChecked={row.is_enabled}
              className="size-4 rounded border-zinc-300 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900"
            />
            Modal habilitado
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="submit"
            className="rounded-lg border border-rose-950 bg-rose-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-900 hover:border-rose-900 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            Guardar
          </button>
          <button
            type="submit"
            formAction={deleteStoreWelcomeModal}
            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-red-800/55 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/25"
          >
            Eliminar
          </button>
        </div>
      </form>
    </li>
  );
}

export function StoreWelcomeModalPanel({
  modals,
  errorCode,
}: {
  modals: StoreWelcomeModalRow[];
  errorCode?: string;
}) {
  const adminTheme = useAdminTheme();
  const resolved = adminTheme?.resolved ?? "light";
  const err = errorText(errorCode);

  return (
    <section className={welcomePanelShell(resolved)}>
      <div>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-zinc-100">
          Modal de bienvenida
        </h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-zinc-400">
          Crea promos dinámicas tipo “Regístrate y obtén descuento”.
        </p>
      </div>

      {err ? (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100">
          {err}
        </p>
      ) : null}

      <form
        action={createStoreWelcomeModal}
        className={welcomeCreateFormShell(resolved)}
      >
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Crear modal</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Imagen (opcional)</label>
            <input
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className={`${inputClass} block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 dark:text-zinc-400 dark:file:bg-zinc-800 dark:file:text-zinc-100`}
            />
          </div>
          <input
            name="title"
            required
            placeholder="Regístrate y obtén 10% OFF"
            className={`${inputClass} sm:col-span-2`}
          />
          <textarea
            name="description"
            placeholder="Te damos un código de descuento exclusivo..."
            rows={3}
            className={`${inputClass} sm:col-span-2`}
          />
          <input
            name="discount_code"
            placeholder="BIENVENIDA10"
            className={inputClass}
          />
          <input
            name="sort_order"
            type="number"
            min={0}
            placeholder="0"
            className={inputClass}
          />
          <input
            name="cta_label"
            placeholder="Quiero mi descuento"
            defaultValue="Quiero mi descuento"
            className={inputClass}
          />
          <input
            name="cta_href"
            type="url"
            placeholder="https://wa.me/..."
            className={inputClass}
          />
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200 sm:col-span-2">
            <input
              type="checkbox"
              name="is_enabled"
              defaultChecked
              className="size-4 rounded border-zinc-300 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900"
            />
            Habilitar al crear
          </label>
        </div>
        <button
          type="submit"
          className="rounded-lg border border-rose-950 bg-rose-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-900 hover:border-rose-900 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
        >
          Crear modal
        </button>
      </form>

      {modals.length > 0 ? (
        <ul className="space-y-3">
          {modals.map((row) => (
            <WelcomeModalRowEditor key={row.id} row={row} resolved={resolved} />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-400">
          Aún no hay modales de bienvenida configurados.
        </p>
      )}
    </section>
  );
}

