"use client";

import Image from "next/image";
import {
  deleteStoreBanner,
  updateStoreBanner,
  uploadStoreBanner,
} from "@/app/actions/admin/store-banners";
import {
  productInputClass as inputClass,
  productLabelClass as labelClass,
  productSectionTitle as sectionTitle,
} from "@/components/admin/product-form-primitives";
import type { StoreBannerRow } from "@/lib/store-banners";
import { shouldUnoptimizeStorageImageUrl, storagePublicObjectUrl } from "@/lib/storage-public-url";

const shellCard =
  "rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-none dark:ring-white/[0.06]";

function errorText(code: string | undefined): string | null {
  if (!code) return null;
  switch (code) {
    case "file":
      return "Selecciona un archivo de imagen.";
    case "size":
      return "El archivo supera 5 MB.";
    case "type":
      return "Solo se permiten imágenes JPEG, PNG, WebP o GIF.";
    case "upload":
      return "Error al subir a Storage. Revisa el bucket store-banners y permisos.";
    case "db":
      return "Error en la base de datos. Ejecuta la migración store_banners.";
    case "placement":
      return "Ubicación de banner no válida.";
    default:
      return "Algo salió mal. Intenta de nuevo.";
  }
}

function BannerRowEditor({ row }: { row: StoreBannerRow }) {
  const url = storagePublicObjectUrl(row.image_path);

  return (
    <li className="min-w-0 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 sm:p-5 dark:border-zinc-700 dark:bg-zinc-950/50">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        <div className="relative mx-auto aspect-[5/3] w-full max-w-md shrink-0 overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-800 sm:mx-0 sm:aspect-auto sm:h-28 sm:w-44">
          {url ? (
            <Image
              src={url}
              alt="Banner"
              fill
              sizes="(max-width: 640px) 100vw, 176px"
              className="object-cover"
              unoptimized={shouldUnoptimizeStorageImageUrl(url)}
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <form action={deleteStoreBanner} className="w-full sm:w-auto">
              <input type="hidden" name="id" value={row.id} readOnly />
              <button
                type="submit"
                className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-50 dark:border-red-800/55 dark:bg-zinc-900 dark:text-red-400 dark:shadow-none dark:hover:bg-red-950/25 sm:w-auto"
              >
                Eliminar
              </button>
            </form>
          </div>

          <form action={updateStoreBanner} className="space-y-3">
            <input type="hidden" name="id" value={row.id} readOnly />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0 sm:col-span-2">
                <label className={labelClass}>Enlace (opcional)</label>
                <input
                  name="href"
                  type="url"
                  defaultValue={row.href ?? ""}
                  placeholder="https://…"
                  className={inputClass}
                />
              </div>
              <div className="min-w-0">
                <label className={labelClass}>Orden</label>
                <input
                  name="sort_order"
                  type="number"
                  min={0}
                  defaultValue={row.sort_order}
                  className={inputClass}
                />
              </div>
              <div className="flex min-w-0 items-end gap-2 pb-0.5">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  <input
                    type="checkbox"
                    name="is_published"
                    defaultChecked={row.is_published}
                    className="size-4 shrink-0 rounded border-zinc-300 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900"
                  />
                  Publicado
                </label>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                className="w-full rounded-lg border border-rose-950 bg-rose-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-900 hover:border-rose-900 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white sm:w-auto sm:text-xs"
              >
                Guardar cambios
              </button>
            </div>
          </form>
        </div>
      </div>
    </li>
  );
}

function UploadBlock({
  placement,
  title,
  hint,
}: {
  placement: "hero" | "products";
  title: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-4 sm:p-5 dark:border-zinc-600 dark:bg-zinc-950/40">
      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{title}</p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
      <form
        action={uploadStoreBanner}
        className="mt-4 space-y-3"
      >
        <input type="hidden" name="placement" value={placement} readOnly />
        <div>
          <label className={labelClass}>Imagen</label>
          <input
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            required
            className="mt-1.5 block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 dark:text-zinc-400 dark:file:bg-zinc-800 dark:file:text-zinc-100"
          />
        </div>
        <div>
          <label className={labelClass}>Enlace al hacer clic (opcional)</label>
          <input name="href" type="url" placeholder="https://…" className={inputClass} />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg border border-rose-950 bg-rose-950 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-900 hover:border-rose-900 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white sm:w-auto sm:px-5"
        >
          Subir banner
        </button>
      </form>
    </div>
  );
}

function Section({
  placement,
  label,
  description,
  rows,
}: {
  placement: "hero" | "products";
  label: string;
  description: string;
  rows: StoreBannerRow[];
}) {
  const list = rows.filter((r) => r.placement === placement);

  return (
    <section className={`${shellCard} p-4 sm:p-6`}>
      <h2 className={sectionTitle}>{label}</h2>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>

      {list.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          Todavía no hay banners. Sube la primera imagen.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {list.map((row) => (
            <BannerRowEditor key={row.id} row={row} />
          ))}
        </ul>
      )}

      <div className="mt-6">
        <UploadBlock
          placement={placement}
          title="Añadir otra imagen al carrusel"
          hint={
            placement === "hero"
              ? "Se muestran a la derecha del título en el inicio, con flechas y puntos si hay varias."
              : "Se muestra arriba del listado de productos; puedes subir varias para carrusel."
          }
        />
      </div>
    </section>
  );
}

export function BannersAdminPanel({
  banners,
  errorCode,
}: {
  banners: StoreBannerRow[];
  errorCode?: string;
}) {
  const err = errorText(errorCode);

  return (
    <div className="space-y-8">
      {err ? (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100">
          {err}
        </p>
      ) : null}

      <Section
        placement="hero"
        label="Hero (inicio)"
        description="Banners del carrusel principal del home. El orden numérico define el deslizamiento (menor primero)."
        rows={banners}
      />

      <Section
        placement="products"
        label="Sección productos"
        description="En el catálogo completo, la primera imagen publicada (menor orden) es el hero ancho con título; el resto se usa en carrusel cuando apliqués filtros u orden. Sin ningún banner aquí, /products no muestra hero, solo el listado."
        rows={banners}
      />
    </div>
  );
}
